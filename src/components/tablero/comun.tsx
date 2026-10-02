import { clsx } from 'clsx'
import { Inbox, TrendingDown, TrendingUp, TriangleAlert, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { FechaInput } from '@/components/ui/fecha-input'
import { PRESETS, type PresetRango } from './formato'

// Piezas de los dashboards, con el mismo diseño de vehiman_react (src/dashboard/comun.tsx):
// encabezado, bloques blancos redondeados, tarjetas KPI con tono e ícono, malla
// responsive, estados de carga/error/vacío y tabla simple.

export function Encabezado({ titulo, descripcion, accion }: { titulo: string; descripcion: string; accion?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-[26px] font-bold tracking-[-0.02em] text-foreground">{titulo}</h1>
        <p className="mt-1 text-[14px] text-muted-foreground">{descripcion}</p>
      </div>
      {accion}
    </header>
  )
}

/** Tarjeta con título, para agrupar una gráfica, una tabla o unos totales. */
export function Bloque({ titulo, descripcion, accion, children, className }: { titulo: string; descripcion?: string; accion?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={clsx('rounded-3xl bg-card p-5 ring-1 ring-border/80 sm:p-6', className)}>
      <header className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-[15px] font-semibold text-foreground">{titulo}</h2>
          {descripcion && <p className="mt-0.5 text-[12.5px] text-muted-foreground">{descripcion}</p>}
        </div>
        {accion}
      </header>
      {children}
    </section>
  )
}

export type Tono = 'marca' | 'ok' | 'aviso' | 'err' | 'neutro' | 'info'

const TONOS: Record<Tono, { fondo: string; icono: string }> = {
  marca: { fondo: 'bg-primary/[0.06] dark:bg-primary/10', icono: 'bg-primary/10 text-primary' },
  info: { fondo: 'bg-blue-50 dark:bg-blue-500/10', icono: 'bg-white/70 text-blue-600 dark:bg-white/5 dark:text-blue-400' },
  ok: { fondo: 'bg-emerald-50 dark:bg-emerald-500/10', icono: 'bg-white/70 text-emerald-600 dark:bg-white/5 dark:text-emerald-400' },
  aviso: { fondo: 'bg-amber-50 dark:bg-amber-500/10', icono: 'bg-white/70 text-amber-600 dark:bg-white/5 dark:text-amber-400' },
  err: { fondo: 'bg-red-50 dark:bg-red-500/10', icono: 'bg-white/70 text-red-600 dark:bg-white/5 dark:text-red-400' },
  neutro: { fondo: 'bg-muted', icono: 'bg-card text-muted-foreground' },
}

interface PropsTarjeta {
  etiqueta: string
  valor: ReactNode
  nota?: ReactNode
  tono?: Tono
  icono?: LucideIcon
  /** Variación contra el periodo anterior (0.12 = +12 %). */
  variacion?: number | null
  /** Si subir es malo (ej. tasa de anulación), la flecha hacia arriba sale en rojo. */
  subirEsMalo?: boolean
}

/** Total destacado (KPI). */
export function Tarjeta({ etiqueta, valor, nota, tono = 'marca', icono: Icono, variacion, subirEsMalo }: PropsTarjeta) {
  const t = TONOS[tono]
  const hayVariacion = variacion != null && Number.isFinite(variacion)
  const bueno = hayVariacion && (subirEsMalo ? variacion! <= 0 : variacion! >= 0)
  return (
    <div className={clsx('flex items-center justify-between gap-3 rounded-3xl p-5', t.fondo)}>
      <div className="min-w-0 text-left">
        <p className="text-[12.5px] font-medium text-muted-foreground">{etiqueta}</p>
        <p className="mt-1 truncate text-[24px] leading-tight font-bold tracking-[-0.02em] text-foreground tabular-nums">{valor}</p>
        {(nota || hayVariacion) && (
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[12px] text-muted-foreground">
            {hayVariacion && (
              <span className={clsx('inline-flex items-center gap-0.5 font-semibold', bueno ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400')}>
                {variacion! >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                {variacion! >= 0 ? '+' : ''}
                {new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 }).format(variacion! * 100)} %
              </span>
            )}
            {nota}
          </p>
        )}
      </div>
      {Icono && (
        <span className={clsx('flex size-10 shrink-0 items-center justify-center rounded-2xl [&>svg]:size-5', t.icono)}>
          <Icono />
        </span>
      )}
    </div>
  )
}

/** Malla responsive: 1 columna en móvil, `n` desde tablet. */
export function Malla({ columnas = 3, children, className }: { columnas?: 2 | 3 | 4 | 5; children: ReactNode; className?: string }) {
  const c = { 2: 'lg:grid-cols-2', 3: 'sm:grid-cols-2 lg:grid-cols-3', 4: 'sm:grid-cols-2 lg:grid-cols-4', 5: 'sm:grid-cols-2 lg:grid-cols-5' }[columnas]
  return <div className={clsx('grid grid-cols-1 gap-4', c, className)}>{children}</div>
}

interface Consulta {
  isLoading: boolean
  isError: boolean
}

/** Cargando, error y vacío de un bloque; si hay datos, muestra `children`. */
export function CuerpoConsulta({ consulta, vacio, mensajeVacio = 'No hay datos en este periodo', altura = 'h-64', children }: { consulta: Consulta; vacio?: boolean; mensajeVacio?: string; altura?: string; children: ReactNode }) {
  if (consulta.isLoading) return <div role="status" aria-label="Cargando" className={clsx('animate-pulse rounded-2xl bg-muted', altura)} />
  if (consulta.isError) {
    return (
      <div className={clsx('flex flex-col items-center justify-center gap-2 text-center', altura)}>
        <TriangleAlert className="size-6 text-destructive" />
        <p className="text-[14px] text-destructive">No se pudo cargar la información</p>
      </div>
    )
  }
  if (vacio) {
    return (
      <div className={clsx('flex flex-col items-center justify-center gap-2 text-center', altura)}>
        <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Inbox className="size-5" />
        </span>
        <p className="text-[13.5px] text-muted-foreground">{mensajeVacio}</p>
      </div>
    )
  }
  return <>{children}</>
}

/** Periodos rápidos + desde/hasta, en una sola fila sobre las gráficas. */
export function SelectorRango({
  preset,
  desde,
  hasta,
  alElegirPreset,
  alCambiarDesde,
  alCambiarHasta,
  min,
  max,
}: {
  preset: PresetRango | null
  desde: string
  hasta: string
  alElegirPreset: (p: PresetRango) => void
  alCambiarDesde: (v: string) => void
  alCambiarHasta: (v: string) => void
  min?: string
  max?: string
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end gap-3">
      <div className="flex rounded-2xl bg-muted p-1" role="group" aria-label="Periodo">
        {PRESETS.map((p) => (
          <button
            key={p.valor}
            type="button"
            onClick={() => alElegirPreset(p.valor)}
            className={clsx(
              'whitespace-nowrap rounded-xl px-3.5 py-2 text-[13px] font-medium transition',
              preset === p.valor ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {p.etiqueta}
          </button>
        ))}
      </div>
      <label className="flex flex-col gap-1 text-[12px] font-medium text-muted-foreground">
        Desde
        <FechaInput value={desde} onChange={alCambiarDesde} min={min} max={hasta || max} className="h-10 w-40 rounded-xl" />
      </label>
      <label className="flex flex-col gap-1 text-[12px] font-medium text-muted-foreground">
        Hasta
        <FechaInput value={hasta} onChange={alCambiarHasta} min={desde || min} max={max} className="h-10 w-40 rounded-xl" />
      </label>
    </div>
  )
}

export interface Columna<T> {
  titulo: string
  celda: (fila: T) => ReactNode
  alinear?: 'izq' | 'der'
  /** Se oculta por debajo de `lg` para que la tabla quepa en móvil. */
  secundaria?: boolean
}

/** Tabla simple de los dashboards (sin paginación: los detalles son cortos). */
export function Tabla<T>({ columnas, filas, clave }: { columnas: Columna<T>[]; filas: T[]; clave: (f: T, i: number) => string | number }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[13.5px]">
        <thead>
          <tr className="text-left text-[12px] font-medium text-muted-foreground">
            {columnas.map((c) => (
              <th key={c.titulo} className={clsx('whitespace-nowrap px-3 py-3 font-medium first:pl-0 last:pr-0', c.alinear === 'der' && 'text-right', c.secundaria && 'max-lg:hidden')}>
                {c.titulo}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.map((f, i) => (
            <tr key={clave(f, i)} className="border-t border-border/70">
              {columnas.map((c) => (
                <td key={c.titulo} className={clsx('px-3 py-2.5 first:pl-0 last:pr-0', c.alinear === 'der' ? 'text-right tabular-nums' : 'text-foreground/80', c.secundaria && 'max-lg:hidden')}>
                  {c.celda(f)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
