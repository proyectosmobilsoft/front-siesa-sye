import { Suspense, useContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { UNSAFE_LocationContext, useLocation, useNavigate, type Location } from 'react-router-dom'
import { Cargando } from '@/components/ui/cargando'
import { useAuthStore } from '@/store/authStore'
import { usePestanasStore } from '@/store/pestanasStore'
import {
  INICIO, abrirPestana, cerrarPestana, claveDe, guardarPestanas, leerPestanas, tieneRuta, type Pestana,
} from '@/config/pestanas'

/**
 * Las páginas del sistema como pestañas de navegador. Cada página abierta queda MONTADA (oculta) mientras no es la
 * activa, así al volver a ella está como la dejaste: filtros, tablas expandidas, formularios a medias.
 *
 * `renderRutas(location)` pinta las rutas de la app para una ubicación dada. Cada pestaña recibe SU ubicación
 * (la última que tuvo), por eso `useLocation`/`useSearchParams` dentro de una página oculta siguen leyendo lo suyo.
 */
export function PestanasPanels({ renderRutas }: { renderRutas: (location: Location) => ReactNode }) {
  const location = useLocation()
  const navigate = useNavigate()
  const contextoRuta = useContext(UNSAFE_LocationContext)
  const scope = String(useAuthStore((s) => s.sesion?.id ?? 'anonimo'))

  const [guardado] = useState(() => leerPestanas(scope))
  const [tabs, setTabs] = useState<Pestana[]>(guardado.tabs)
  // Al abrir la app en "/" se vuelve a la pestaña en la que se estaba (solo en la carga inicial).
  const [restaurarUrl, setRestaurarUrl] = useState<string | null>(
    () => (location.pathname === '/' && !location.search && guardado.activa !== '/' ? guardado.activa : null),
  )
  const [aviso, setAviso] = useState(false)
  const [ultimaActiva, setUltimaActiva] = useState<string>(INICIO.key)
  const ubicaciones = useRef(new Map<string, Location>())
  const scrolls = useRef(new Map<string, number>())
  const raiz = useRef<HTMLDivElement>(null)

  const key = claveDe(location.pathname)
  const url = location.pathname + location.search + location.hash
  const valida = tieneRuta(location.pathname)
  const siguiente = valida ? abrirPestana(tabs, key, url) : tabs
  const bloqueada = siguiente === null
  const activa = bloqueada || !valida ? ultimaActiva : key
  if (valida && !bloqueada && !restaurarUrl) ubicaciones.current.set(key, location)

  useEffect(() => {
    if (restaurarUrl) {
      if (url !== restaurarUrl) navigate(restaurarUrl, { replace: true })
      else setRestaurarUrl(null)
      return
    }
    if (!valida) return
    if (bloqueada) {
      setAviso(true)
      const volver = ultimaActiva === INICIO.key ? '/' : tabs.find((t) => t.key === ultimaActiva)?.url ?? '/'
      navigate(volver, { replace: true })
      return
    }
    setUltimaActiva(key)
    if (siguiente && JSON.stringify(siguiente) !== JSON.stringify(tabs)) setTabs(siguiente)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bloqueada, key, url, restaurarUrl, valida])

  useEffect(() => {
    if (!restaurarUrl && !bloqueada && valida) guardarPestanas(scope, tabs, url)
  }, [tabs, url, restaurarUrl, bloqueada, valida, scope])

  const cerrar = (cerrada: string) => {
    const indice = tabs.findIndex((t) => t.key === cerrada)
    const restantes = cerrarPestana(tabs, cerrada)
    ubicaciones.current.delete(cerrada)
    scrolls.current.delete(cerrada)
    setTabs(restantes)
    setAviso(false)
    if (cerrada === activa) navigate(restantes[indice]?.url ?? restantes[indice - 1]?.url ?? '/', { replace: true })
  }

  // Lo que ve la tira del header.
  useEffect(() => {
    usePestanasStore.setState({ tabs, activa, aviso, cerrar })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabs, activa, aviso])
  useEffect(() => () => usePestanasStore.setState({ tabs: [], activa: '/', aviso: false }), [])

  // Cada pestaña recuerda hasta dónde estaba desplazada la página (el scroll es del <main>).
  const activaRef = useRef(activa)
  activaRef.current = activa
  useEffect(() => {
    const main = raiz.current?.closest('main')
    if (!main) return
    const guardar = () => scrolls.current.set(activaRef.current, main.scrollTop)
    main.addEventListener('scroll', guardar, { passive: true })
    return () => main.removeEventListener('scroll', guardar)
  }, [])
  useLayoutEffect(() => {
    const main = raiz.current?.closest('main')
    if (main) main.scrollTop = scrolls.current.get(activa) ?? 0
  }, [activa])

  const ordenadas = [INICIO, ...tabs]
  return (
    <div ref={raiz} className="h-full">
      {ordenadas.map((tab) => {
        const ubicacion = ubicaciones.current.get(tab.key)
        if (!ubicacion) return null
        const esActiva = tab.key === activa
        return (
          <div key={tab.key} hidden={!esActiva} className={esActiva ? 'h-full' : undefined}>
            <UNSAFE_LocationContext.Provider value={{ ...contextoRuta, location: ubicacion }}>
              <Suspense fallback={<Cargando texto="Cargando" className="h-full" />}>
                {renderRutas(ubicacion)}
              </Suspense>
            </UNSAFE_LocationContext.Provider>
          </div>
        )
      })}
    </div>
  )
}
