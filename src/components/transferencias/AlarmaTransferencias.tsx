import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { transferenciasConfirmacionApi } from '@/api/transferenciasConfirmacion'
import { conectarEventos } from '@/api/eventos'
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

// Melodía corta y agradable (arpegio de do mayor con campanita), generada como WAV para reproducirla con <audio>,
// que Firefox permite tras el primer clic en la página (el audio por WebAudio se quedaba mudo)
const MELODIA: ReadonlyArray<readonly [number, number, number]> = [
  [0, 523.25, 0.5], [0.22, 659.25, 0.5], [0.44, 783.99, 0.5], [0.66, 1046.5, 0.9],
  [1.5, 783.99, 0.4], [1.72, 1046.5, 1.1],
]

function construirWav(): Blob {
  const tasa = 22_050
  const muestras = new Float32Array(Math.ceil(tasa * 3))
  for (const [inicio, frecuencia, duracion] of MELODIA) {
    const desde = Math.floor(inicio * tasa)
    const total = Math.floor(duracion * tasa)
    for (let i = 0; i < total && desde + i < muestras.length; i++) {
      const t = i / tasa
      const base = 2 * Math.abs(2 * ((frecuencia * t) % 1) - 1) - 1
      const octava = Math.sin(2 * Math.PI * frecuencia * 2 * t)
      const envolvente = Math.min(1, t / 0.02) * Math.exp(-5 * t / duracion)
      muestras[desde + i] += (base + 0.3 * octava) * envolvente
    }
  }
  const pico = muestras.reduce((max, v) => Math.max(max, Math.abs(v)), 0) || 1
  const datos = new DataView(new ArrayBuffer(44 + muestras.length * 2))
  const texto = (offset: number, valor: string) => { for (let i = 0; i < valor.length; i++) datos.setUint8(offset + i, valor.charCodeAt(i)) }
  texto(0, 'RIFF'); datos.setUint32(4, 36 + muestras.length * 2, true); texto(8, 'WAVEfmt ')
  datos.setUint32(16, 16, true); datos.setUint16(20, 1, true); datos.setUint16(22, 1, true)
  datos.setUint32(24, tasa, true); datos.setUint32(28, tasa * 2, true); datos.setUint16(32, 2, true); datos.setUint16(34, 16, true)
  texto(36, 'data'); datos.setUint32(40, muestras.length * 2, true)
  muestras.forEach((v, i) => datos.setInt16(44 + i * 2, Math.round((v / pico) * 0.85 * 32767), true))
  return new Blob([datos], { type: 'audio/wav' })
}

export function AlarmaTransferenciasProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const autorizado = useAuthStore(s => s.permisos.includes(PERMISOS.APROBAR_TRANSFERENCIA))
  const centro = useAuthStore(s => s.centroOperacionActivo)
  const usuarioId = useAuthStore(s => s.sesion?.id)
  const clave = `alarma-transferencias:${usuarioId ?? 'anonimo'}`
  const claveVistos = `${clave}:vistos:${centro ?? 'todos'}`
  const [activa, setActiva] = useState(() => localStorage.getItem(clave) !== 'false')
  const [desbloqueado, setDesbloqueado] = useState(false)
  const [sonidoBloqueado, setSonidoBloqueado] = useState(false)
  const [silenciadaHasta, setSilenciadaHasta] = useState(0)
  const [ahora, setAhora] = useState(Date.now)
  const [revisionVistos, setRevisionVistos] = useState(0)
  const [permisoNotificaciones, setPermisoNotificaciones] = useState<NotificationPermission | 'unsupported'>(() => 'Notification' in window ? Notification.permission : 'unsupported')
  const audio = useRef<HTMLAudioElement | null>(null)
  const urlAudio = useRef('')
  const vistos = useRef(leerVistos(claveVistos))
  const claveVistosActual = useRef(claveVistos)
  const avisados = useRef(new Set<number>())
  const avisos = useRef(new Map<number, Notification>())
  const atenderAlRecibir = useRef(false)
  const consulta = useQuery({
    queryKey: ['transferencias-confirmacion', 'alarma', centro, usuarioId],
    queryFn: transferenciasConfirmacionApi.pendientesAlarma,
    enabled: autorizado,
    refetchInterval: 30_000,
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
    if (audio.current) { audio.current.pause(); audio.current.currentTime = 0 }
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

  useEffect(() => { setActiva(localStorage.getItem(clave) !== 'false'); callar() }, [clave, centro]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const timer = window.setInterval(() => setAhora(Date.now()), 1_000); return () => window.clearInterval(timer) }, [])

  useEffect(() => {
    if (!autorizado || usuarioId == null) return
    return conectarEventos((evento) => {
      if (evento === 'transferencia.pendiente' || evento === 'transferencia.actualizada') {
        void queryClient.invalidateQueries({ queryKey: ['transferencias-confirmacion', 'alarma'] })
        void queryClient.invalidateQueries({ queryKey: ['transferencias-confirmacion', 'resumen'] })
      }
    })
  }, [autorizado, usuarioId, queryClient])

  const elemento = () => {
    if (!audio.current) {
      urlAudio.current = URL.createObjectURL(construirWav())
      audio.current = new Audio(urlAudio.current)
      audio.current.preload = 'auto'
    }
    return audio.current
  }

  // Un clic del usuario habilita el sonido: se reproduce en silencio y se deja listo
  const desbloquear = () => {
    const el = elemento()
    el.muted = true
    void el.play().then(() => { el.pause(); el.currentTime = 0; el.muted = false; setDesbloqueado(true); setSonidoBloqueado(false) }).catch(() => { el.muted = false })
    if ('Notification' in window && Notification.permission === 'default') void Notification.requestPermission().then(setPermisoNotificaciones).catch(() => {})
  }

  const habilitarSonido = () => {
    const el = elemento()
    el.muted = false
    el.volume = 0.55
    el.currentTime = 0
    void el.play().then(() => { setDesbloqueado(true); setSonidoBloqueado(false) }).catch(() => setSonidoBloqueado(true))
  }

  useEffect(() => {
    if (!autorizado || !activa || desbloqueado) return
    window.addEventListener('click', desbloquear, { once: true })
    return () => window.removeEventListener('click', desbloquear)
  }, [autorizado, activa, desbloqueado]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => { cerrarAvisos(); if (audio.current) audio.current.pause(); if (urlAudio.current) URL.revokeObjectURL(urlAudio.current) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const activar = () => {
    setActiva(true)
    localStorage.setItem(clave, 'true')
    setSilenciadaHasta(0)
    habilitarSonido()
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
  const sonando = autorizado && activa && !silenciada && !atenderAlRecibir.current && sinVer.length > 0
  useEffect(() => {
    if (!sonando) return
    const sonar = () => {
      const el = elemento()
      el.muted = false
      el.volume = escalada ? 0.9 : 0.55
      el.currentTime = 0
      void el.play().then(() => setSonidoBloqueado(false)).catch(() => setSonidoBloqueado(true))
    }
    sonar()
    const timer = window.setInterval(sonar, escalada ? 9_000 : 12_000)
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

  return <AlarmaContext.Provider value={{ total, activa, silenciada, sonidoBloqueado, permisoNotificaciones, activar, silenciar, habilitarSonido, atenderPendientes, verSolicitud }}>{children}</AlarmaContext.Provider>
}
