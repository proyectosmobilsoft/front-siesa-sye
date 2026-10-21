import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { transferenciasConfirmacionApi } from '@/api/transferenciasConfirmacion'
import { PERMISOS } from '@/config/permisos'
import { useAuthStore } from '@/store/authStore'
import { formatters } from '@/utils/formatters'
import { AlarmaContext } from './alarmaContext'

function timbre(contexto: AudioContext) {
  if (contexto.state !== 'running') return
  for (const [inicio, frecuencia] of [[0, 880], [0.24, 660]] as const) {
    const oscilador = contexto.createOscillator()
    const volumen = contexto.createGain()
    oscilador.type = 'sine'
    oscilador.frequency.value = frecuencia
    volumen.gain.setValueAtTime(0.0001, contexto.currentTime + inicio)
    volumen.gain.exponentialRampToValueAtTime(0.16, contexto.currentTime + inicio + 0.02)
    volumen.gain.exponentialRampToValueAtTime(0.0001, contexto.currentTime + inicio + 0.2)
    oscilador.connect(volumen).connect(contexto.destination)
    oscilador.start(contexto.currentTime + inicio)
    oscilador.stop(contexto.currentTime + inicio + 0.21)
  }
}

export function AlarmaTransferenciasProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const autorizado = useAuthStore(s => s.permisos.includes(PERMISOS.APROBAR_TRANSFERENCIA))
  const centro = useAuthStore(s => s.centroOperacionActivo)
  const usuarioId = useAuthStore(s => s.sesion?.id)
  const clave = `alarma-transferencias:${usuarioId ?? 'anonimo'}`
  const [activa, setActiva] = useState(() => localStorage.getItem(clave) === 'true')
  const [audioListo, setAudioListo] = useState(false)
  const [silenciadaHasta, setSilenciadaHasta] = useState(0)
  const [ahora, setAhora] = useState(Date.now)
  const [permisoNotificaciones, setPermisoNotificaciones] = useState<NotificationPermission | 'unsupported'>(() => 'Notification' in window ? Notification.permission : 'unsupported')
  const audio = useRef<AudioContext | null>(null)
  const vistos = useRef<Set<number>>(new Set())
  const consulta = useQuery({
    queryKey: ['transferencias-confirmacion', 'alarma', centro, usuarioId],
    queryFn: transferenciasConfirmacionApi.pendientesAlarma,
    enabled: autorizado,
    refetchInterval: 8_000,
    refetchIntervalInBackground: true,
    retry: false,
  })
  const total = autorizado ? consulta.data?.total ?? 0 : 0
  const silenciada = silenciadaHasta > ahora

  useEffect(() => { setActiva(localStorage.getItem(clave) === 'true'); vistos.current.clear() }, [clave, centro])
  useEffect(() => { const timer = window.setInterval(() => setAhora(Date.now()), 1_000); return () => window.clearInterval(timer) }, [])

  const prepararAudio = () => {
    try {
      audio.current ??= new AudioContext()
      void audio.current.resume().then(() => setAudioListo(true)).catch(() => setAudioListo(false))
    } catch { setAudioListo(false) }
  }

  useEffect(() => {
    if (!autorizado || !activa || audioListo) return
    const desbloquear = () => prepararAudio()
    window.addEventListener('click', desbloquear, { once: true })
    return () => window.removeEventListener('click', desbloquear)
  }, [autorizado, activa, audioListo])

  useEffect(() => () => { if (audio.current) void audio.current.close() }, [])

  const activar = () => {
    setActiva(true)
    localStorage.setItem(clave, 'true')
    setSilenciadaHasta(0)
    prepararAudio()
    if ('Notification' in window) {
      void Notification.requestPermission().then(setPermisoNotificaciones).catch(() => setPermisoNotificaciones(Notification.permission))
    }
  }

  const silenciar = () => setSilenciadaHasta(Date.now() + 5 * 60_000)

  useEffect(() => {
    if (!autorizado || !consulta.data) return
    const pendientes = new Set(consulta.data.items.map(item => item.id))
    for (const item of consulta.data.items) {
      if (vistos.current.has(item.id)) continue
      vistos.current.add(item.id)
      if (!activa || permisoNotificaciones !== 'granted') continue
      try {
        const aviso = new Notification('Autorización de transferencia pendiente', {
          body: `${item.conductor_nombre || 'Conductor'} · ${formatters.currency(Number(item.valor) || 0)}`,
          tag: `transferencia-${item.id}`,
        })
        aviso.onclick = () => { window.focus(); navigate('/tesoreria/confirmacion-transferencias'); aviso.close() }
      } catch { /* El navegador puede bloquear avisos aunque haya concedido permiso. */ }
    }
    for (const id of vistos.current) if (!pendientes.has(id)) vistos.current.delete(id)
  }, [autorizado, consulta.data, activa, permisoNotificaciones, navigate])

  useEffect(() => {
    if (!autorizado || !activa || !audioListo || silenciada || total === 0) return
    timbre(audio.current!)
    const timer = window.setInterval(() => timbre(audio.current!), 3_000)
    return () => window.clearInterval(timer)
  }, [autorizado, activa, audioListo, silenciada, total])

  useEffect(() => {
    if (!autorizado || total === 0) return
    const titulo = document.title
    let mostrar = true
    const timer = window.setInterval(() => {
      document.title = mostrar ? `(${total}) Autorización pendiente` : titulo
      mostrar = !mostrar
    }, 1_000)
    document.title = `(${total}) Autorización pendiente`
    return () => { window.clearInterval(timer); document.title = titulo }
  }, [autorizado, total])

  useEffect(() => {
    if (consulta.data && total === 0) void queryClient.invalidateQueries({ queryKey: ['transferencias-confirmacion', 'resumen'] })
  }, [consulta.data, total, queryClient])

  return <AlarmaContext.Provider value={{ total, activa, silenciada, permisoNotificaciones, activar, silenciar }}>{children}</AlarmaContext.Provider>
}
