import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { transferenciasConfirmacionApi } from '@/api/transferenciasConfirmacion'
import { PERMISOS } from '@/config/permisos'
import { useAuthStore } from '@/store/authStore'
import { formatters } from '@/utils/formatters'
import { AlarmaContext } from './alarmaContext'

function leerVistos(clave: string): Set<number> {
  try {
    const ids: unknown = JSON.parse(sessionStorage.getItem(clave) || '[]')
    return new Set(Array.isArray(ids) ? ids.filter((id): id is number => Number.isInteger(id)) : [])
  } catch { return new Set() }
}

function timbre(contexto: AudioContext, salida: GainNode, volumen: number) {
  if (contexto.state !== 'running') return
  for (const [inicio, frecuencia] of [[0, 660], [0.28, 523]] as const) {
    const oscilador = contexto.createOscillator()
    const ganancia = contexto.createGain()
    oscilador.type = 'sine'
    oscilador.frequency.value = frecuencia
    ganancia.gain.setValueAtTime(0.0001, contexto.currentTime + inicio)
    ganancia.gain.exponentialRampToValueAtTime(volumen, contexto.currentTime + inicio + 0.04)
    ganancia.gain.exponentialRampToValueAtTime(0.0001, contexto.currentTime + inicio + 0.23)
    oscilador.connect(ganancia).connect(salida)
    oscilador.start(contexto.currentTime + inicio)
    oscilador.stop(contexto.currentTime + inicio + 0.24)
  }
}

export function AlarmaTransferenciasProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const autorizado = useAuthStore(s => s.permisos.includes(PERMISOS.APROBAR_TRANSFERENCIA))
  const centro = useAuthStore(s => s.centroOperacionActivo)
  const usuarioId = useAuthStore(s => s.sesion?.id)
  const clave = `alarma-transferencias:${usuarioId ?? 'anonimo'}`
  const claveVistos = `${clave}:vistos:${centro ?? 'todos'}`
  const [activa, setActiva] = useState(() => localStorage.getItem(clave) === 'true')
  const [audioListo, setAudioListo] = useState(false)
  const [silenciadaHasta, setSilenciadaHasta] = useState(0)
  const [ahora, setAhora] = useState(Date.now)
  const [revisionVistos, setRevisionVistos] = useState(0)
  const [permisoNotificaciones, setPermisoNotificaciones] = useState<NotificationPermission | 'unsupported'>(() => 'Notification' in window ? Notification.permission : 'unsupported')
  const audio = useRef<AudioContext | null>(null)
  const salida = useRef<GainNode | null>(null)
  const vistos = useRef(leerVistos(claveVistos))
  const claveVistosActual = useRef(claveVistos)
  const avisados = useRef(new Set<number>())
  const avisos = useRef(new Map<number, Notification>())
  const atenderAlRecibir = useRef(false)
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

  if (claveVistosActual.current !== claveVistos) {
    claveVistosActual.current = claveVistos
    vistos.current = leerVistos(claveVistos)
    avisados.current.clear()
    atenderAlRecibir.current = false
  }

  const cerrarAvisos = () => {
    for (const aviso of avisos.current.values()) aviso.close()
    avisos.current.clear()
  }
  const callar = () => {
    if (audio.current && salida.current) salida.current.gain.setValueAtTime(0, audio.current.currentTime)
    cerrarAvisos()
  }
  const marcarVistos = (ids: number[]) => {
    let cambio = false
    for (const id of ids) if (!vistos.current.has(id)) { vistos.current.add(id); cambio = true }
    if (cambio) {
      sessionStorage.setItem(claveVistos, JSON.stringify([...vistos.current]))
      setRevisionVistos(n => n + 1)
    }
  }
  const atenderPendientes = () => {
    if (!autorizado) return
    callar()
    if (consulta.data) marcarVistos(consulta.data.items.map(item => item.id))
    else atenderAlRecibir.current = true
  }
  const verSolicitud = (id: number) => {
    if (!autorizado) return
    atenderPendientes()
    marcarVistos([id])
  }

  useEffect(() => { setActiva(localStorage.getItem(clave) === 'true'); callar() }, [clave, centro]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const timer = window.setInterval(() => setAhora(Date.now()), 1_000); return () => window.clearInterval(timer) }, [])

  const prepararAudio = () => {
    try {
      if (!audio.current) {
        audio.current = new AudioContext()
        salida.current = audio.current.createGain()
        salida.current.connect(audio.current.destination)
      }
      void audio.current.resume().then(() => setAudioListo(true)).catch(() => setAudioListo(false))
    } catch { setAudioListo(false) }
  }

  const probar = () => {
    prepararAudio()
    const contexto = audio.current
    const ganancia = salida.current
    if (!contexto || !ganancia) return
    void contexto.resume().then(() => { ganancia.gain.setValueAtTime(1, contexto.currentTime); timbre(contexto, ganancia, 0.12) }).catch(() => {})
  }

  useEffect(() => {
    if (!autorizado || !activa || audioListo) return
    const desbloquear = () => prepararAudio()
    window.addEventListener('click', desbloquear, { once: true })
    return () => window.removeEventListener('click', desbloquear)
  }, [autorizado, activa, audioListo])

  useEffect(() => () => { cerrarAvisos(); if (audio.current) void audio.current.close() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const activar = () => {
    setActiva(true)
    localStorage.setItem(clave, 'true')
    setSilenciadaHasta(0)
    prepararAudio()
    if ('Notification' in window) {
      void Notification.requestPermission().then(setPermisoNotificaciones).catch(() => setPermisoNotificaciones(Notification.permission))
    }
  }

  const silenciar = () => { setSilenciadaHasta(Date.now() + 5 * 60_000); callar() }

  useEffect(() => {
    if (!autorizado || !consulta.data) return
    if (atenderAlRecibir.current) {
      atenderAlRecibir.current = false
      marcarVistos(consulta.data.items.map(item => item.id))
      return
    }
    const pendientes = new Set(consulta.data.items.map(item => item.id))
    for (const [id, aviso] of avisos.current) if (!pendientes.has(id)) { aviso.close(); avisos.current.delete(id) }
    for (const id of avisados.current) if (!pendientes.has(id)) avisados.current.delete(id)
    if (!activa || permisoNotificaciones !== 'granted') return
    for (const item of consulta.data.items) {
      if (vistos.current.has(item.id) || avisados.current.has(item.id)) continue
      avisados.current.add(item.id)
      try {
        const aviso = new Notification('Autorización de transferencia pendiente', {
          body: `${item.conductor_nombre || 'Conductor'} · ${formatters.currency(Number(item.valor) || 0)}`,
          tag: `transferencia-${item.id}`,
        })
        avisos.current.set(item.id, aviso)
        aviso.onclose = () => { if (avisos.current.get(item.id) === aviso) avisos.current.delete(item.id) }
        aviso.onclick = () => { window.focus(); atenderPendientes(); navigate('/tesoreria/confirmacion-transferencias') }
      } catch { /* El navegador puede bloquear avisos aunque haya concedido permiso. */ }
    }
  }, [autorizado, consulta.data, activa, permisoNotificaciones, navigate, revisionVistos]) // eslint-disable-line react-hooks/exhaustive-deps

  const sinVer = autorizado ? consulta.data?.items.filter(item => !vistos.current.has(item.id)) ?? [] : []
  const idsSinVer = sinVer.map(item => item.id).join(',')
  const escalada = sinVer.some(item => {
    const creado = Date.parse(item.created_at)
    return Number.isFinite(creado) && ahora - creado > 2 * 60_000
  })
  const sonando = autorizado && activa && audioListo && !silenciada && !atenderAlRecibir.current && sinVer.length > 0
  useEffect(() => {
    if (!sonando || !audio.current || !salida.current) return
    salida.current.gain.setValueAtTime(1, audio.current.currentTime)
    const sonar = () => { if (audio.current && salida.current) timbre(audio.current, salida.current, escalada ? 0.22 : 0.1) }
    sonar()
    const timer = window.setInterval(sonar, escalada ? 8_000 : 12_000)
    return () => window.clearInterval(timer)
  }, [sonando, escalada, idsSinVer])

  useEffect(() => {
    if (!sonando) return
    const titulo = document.title
    let mostrar = true
    const timer = window.setInterval(() => {
      document.title = mostrar ? `(${total}) Autorización pendiente` : titulo
      mostrar = !mostrar
    }, 1_000)
    document.title = `(${total}) Autorización pendiente`
    return () => { window.clearInterval(timer); document.title = titulo }
  }, [sonando, total])

  useEffect(() => {
    if (consulta.data && total === 0) void queryClient.invalidateQueries({ queryKey: ['transferencias-confirmacion', 'resumen'] })
  }, [consulta.data, total, queryClient])

  return <AlarmaContext.Provider value={{ total, activa, silenciada, permisoNotificaciones, activar, silenciar, probar, atenderPendientes, verSolicitud }}>{children}</AlarmaContext.Provider>
}
