import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { Compass, type LucideIcon } from 'lucide-react'
import { apiClient } from '@/api/client'
import { LOGISTICA, navigation } from '@/config/navigation'
import { useAuthStore } from '@/store/authStore'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { Bloque } from '@/components/tablero/comun'
import type { AtajosData } from './tipos'

interface AtajoItem {
  name: string
  href: string
  icon: LucideIcon
}

const MAX_ATAJOS = 5

const rutaElegible = (href: string) =>
  href !== '/' && !href.startsWith('/personalizado/')

/**
 * Pieza principal de "Mi día": un círculo de atajos con hasta 5 accesos
 * posicionados trigonométricamente alrededor de un disco central.
 */
export function CirculoAtajos() {
  const sesionId = useAuthStore((s) => s.sesion?.id)
  const permisos = useAuthStore((s) => s.permisos)
  const hasPermiso = useAuthStore((s) => s.hasPermiso)
  const esEscritorio = useMediaQuery('(min-width: 640px)')
  const reducirMovimiento = useReducedMotion()

  const consulta = useQuery({
    queryKey: ['dashboard-atajos', sesionId],
    queryFn: async () =>
      (await apiClient.get<{ success: boolean; data: AtajosData }>('/dashboard/atajos')).data.data,
    enabled: !!sesionId,
    staleTime: 60 * 1000,
    retry: 1,
  })

  const { itemsMenu, mapaPermitidos } = useMemo(() => {
    const lista: AtajoItem[] = []
    const mapa = new Map<string, AtajoItem>()

    const agregar = (item: { name: string; href?: string; icon: LucideIcon; permiso?: string }, soloMapa = false) => {
      if (!item.href || !rutaElegible(item.href)) return
      if (item.permiso && !hasPermiso(item.permiso)) return
      const entry: AtajoItem = { name: item.name, href: item.href, icon: item.icon }
      if (!mapa.has(item.href)) mapa.set(item.href, entry)
      if (!soloMapa && !lista.some((x) => x.href === item.href)) {
        lista.push(entry)
      }
    }

    for (const item of navigation) {
      if (item.href) agregar(item)
      if (item.subItems) {
        for (const sub of item.subItems) agregar(sub)
      }
    }
    for (const item of LOGISTICA) {
      agregar(item, true)
    }

    return { itemsMenu: lista, mapaPermitidos: mapa }
  }, [hasPermiso, permisos]) // eslint-disable-line react-hooks/exhaustive-deps

  const atajos = useMemo(() => {
    const elegidos: AtajoItem[] = []
    const vistos = new Set<string>()

    for (const ruta of consulta.data?.rutas ?? []) {
      if (elegidos.length >= MAX_ATAJOS) break
      if (!rutaElegible(ruta) || vistos.has(ruta)) continue
      const meta = mapaPermitidos.get(ruta)
      if (!meta) continue
      vistos.add(ruta)
      elegidos.push(meta)
    }

    for (const item of itemsMenu) {
      if (elegidos.length >= MAX_ATAJOS) break
      if (vistos.has(item.href)) continue
      vistos.add(item.href)
      elegidos.push(item)
    }

    return elegidos
  }, [consulta.data?.rutas, itemsMenu, mapaPermitidos])

  const radio = esEscritorio ? 150 : 112
  const diametroAnillo = radio * 2
  const esSugeridoPorRol = consulta.data?.origen === 'rol'

  return (
    <Bloque
      titulo="Tus accesos rápidos"
      descripcion={
        esSugeridoPorRol
          ? 'Sugeridos según tu rol'
          : 'Tus pantallas más frecuentes a un toque'
      }
      className="flex flex-col items-center overflow-hidden"
    >
      {atajos.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          Usa el menú lateral para abrir tus pantallas disponibles.
        </p>
      ) : (
        <div className="flex w-full flex-col items-center">
          <div
            className="relative mx-auto w-full max-w-[300px] sm:max-w-[420px] h-[320px] sm:h-[400px]"
            role="navigation"
            aria-label="Atajos frecuentes"
          >
            {/* Órbita decorativa */}
            <div
              aria-hidden="true"
              style={{
                width: diametroAnillo,
                height: diametroAnillo,
                top: '47%',
                left: '50%',
              }}
              className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-primary/25 bg-primary/[0.02]"
            />

            {/* Disco central */}
            <div
              aria-hidden="true"
              style={{ top: '47%', left: '50%' }}
              className="pointer-events-none absolute flex size-24 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center gap-1 rounded-full bg-card text-foreground shadow-sm ring-1 ring-border/80 sm:size-28"
            >
              <span className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary sm:size-10">
                <Compass className="size-4 sm:size-5" />
              </span>
              <span className="text-xs font-semibold tracking-tight sm:text-sm">Atajos</span>
            </div>

            {/* Hasta 5 botones repartidos uniformemente empezando arriba */}
            {atajos.map((atajo, indice) => {
              const angulo = -Math.PI / 2 + (2 * Math.PI * indice) / atajos.length
              const x = Math.cos(angulo) * radio
              const y = Math.sin(angulo) * radio
              const Icono = atajo.icon

              return (
                <div
                  key={atajo.href}
                  style={{
                    left: `calc(50% + ${x.toFixed(2)}px)`,
                    top: `calc(47% + ${y.toFixed(2)}px)`,
                  }}
                  className="absolute -translate-x-1/2 -translate-y-1/2"
                >
                  <motion.div
                    initial={reducirMovimiento ? false : { opacity: 0, scale: 0.84 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={
                      reducirMovimiento
                        ? { duration: 0 }
                        : { duration: 0.28, delay: indice * 0.06, ease: [0.22, 1, 0.36, 1] }
                    }
                    className="relative flex flex-col items-center"
                  >
                    <Link
                      to={atajo.href}
                      aria-label={atajo.name}
                      className="group flex size-12 items-center justify-center rounded-full border border-border/80 bg-card text-primary shadow-sm transition-all duration-200 hover:scale-110 hover:border-primary/50 hover:bg-primary hover:text-primary-foreground hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-card sm:size-14"
                    >
                      <Icono className="size-5 transition-transform duration-200 group-hover:scale-105 sm:size-6" />
                    </Link>
                    <span className="pointer-events-none absolute top-full mt-1.5 line-clamp-2 w-20 text-center text-[11px] font-medium leading-tight text-foreground sm:w-28 sm:text-xs">
                      {atajo.name}
                    </span>
                  </motion.div>
                </div>
              )
            })}
          </div>

          {esSugeridoPorRol && (
            <p className="mt-1 text-center text-xs text-muted-foreground">
              Sugeridos según tu rol
            </p>
          )}
        </div>
      )}
    </Bloque>
  )
}
