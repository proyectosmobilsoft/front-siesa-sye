import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowDownAZ, ArrowUpAZ, Search } from 'lucide-react'
import { entero } from '@/components/tablero/formato'
import { etiquetaValor } from './formato'
import { VACIO, type ColumnaDetalle, type FiltroColumna, type RespuestaValores } from './tipos'

const ANCHO = 296

function useRetraso<T>(valor: T, ms: number) {
  const [retrasado, setRetrasado] = useState(valor)
  useEffect(() => {
    const id = setTimeout(() => setRetrasado(valor), ms)
    return () => clearTimeout(id)
  }, [valor, ms])
  return retrasado
}

interface Props {
  columna: ColumnaDetalle
  filtro: FiltroColumna | undefined
  ordenActual: 'asc' | 'desc' | null
  ancla: DOMRect
  /** Clave de caché de las consultas de valores: cambia cuando cambian los demás filtros. */
  claveValores: unknown[]
  cargarValores: (buscar: string) => Promise<RespuestaValores>
  alOrdenar: (dir: 'asc' | 'desc') => void
  alAplicar: (filtro: FiltroColumna | null) => void
  alCerrar: () => void
}

/** Menú de una columna: ordenar, filtrar por rango o texto y elegir valores con casillas, como en Excel. */
export function MenuFiltroColumna({ columna, filtro, ordenActual, ancla, claveValores, cargarValores, alOrdenar, alAplicar, alCerrar }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [posicion, setPosicion] = useState({ left: ancla.left, top: ancla.bottom + 4 })
  const [buscar, setBuscar] = useState(filtro?.q ?? '')
  const buscarRetrasado = useRetraso(buscar.trim(), 250)
  // null = sin selección explícita (todos los valores visibles).
  const [marcados, setMarcados] = useState<Set<string> | null>(filtro?.v ? new Set(filtro.v) : null)
  const [min, setMin] = useState(filtro?.min != null ? String(filtro.min) : '')
  const [max, setMax] = useState(filtro?.max != null ? String(filtro.max) : '')
  const esRango = columna.tipo !== 'texto'
  const esFecha = columna.tipo === 'fecha' || columna.tipo === 'fechahora'

  useLayoutEffect(() => {
    const alto = ref.current?.offsetHeight ?? 0
    setPosicion({
      left: Math.max(8, Math.min(ancla.left, window.innerWidth - ANCHO - 8)),
      top: Math.max(8, Math.min(ancla.bottom + 4, window.innerHeight - alto - 8)),
    })
  }, [ancla])

  useEffect(() => {
    const fuera = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) alCerrar() }
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); alCerrar() } }
    document.addEventListener('mousedown', fuera)
    document.addEventListener('keydown', tecla, true)
    return () => { document.removeEventListener('mousedown', fuera); document.removeEventListener('keydown', tecla, true) }
  }, [alCerrar])

  const consulta = useQuery({
    queryKey: [...claveValores, columna.clave, buscarRetrasado],
    queryFn: () => cargarValores(buscarRetrasado),
    staleTime: 60 * 1000,
  })
  const valores = useMemo(() => consulta.data?.valores ?? [], [consulta.data])
  const truncado = consulta.data?.truncado ?? false
  const todosMarcados = marcados === null || (valores.length > 0 && valores.every((v) => marcados.has(v.valor)))

  const alternar = (valor: string) => {
    setMarcados((actual) => {
      if (actual === null) return truncado ? new Set([valor]) : new Set(valores.map((v) => v.valor).filter((v) => v !== valor))
      const siguiente = new Set(actual)
      if (siguiente.has(valor)) siguiente.delete(valor)
      else siguiente.add(valor)
      return siguiente
    })
  }
  const alternarTodos = () => setMarcados(todosMarcados ? new Set() : buscarRetrasado || truncado ? new Set(valores.map((v) => v.valor)) : null)

  const hayRango = min !== '' || max !== ''
  const sinSeleccion = marcados !== null && marcados.size === 0 && !hayRango
  const aplicar = () => {
    const nuevo: FiltroColumna = {}
    if (marcados !== null) nuevo.v = [...marcados]
    else if (buscarRetrasado) nuevo.q = buscarRetrasado
    if (esRango && min !== '') nuevo.min = esFecha ? min : Number(min)
    if (esRango && max !== '') nuevo.max = esFecha ? max : Number(max)
    alAplicar(Object.keys(nuevo).length ? nuevo : null)
  }

  const campoRango = 'h-8 min-w-0 flex-1 rounded-lg border border-input bg-background px-2 text-[12.5px] text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
  const botonOrden = (dir: 'asc' | 'desc', etiqueta: string, Icono: typeof ArrowUpAZ) => (
    <button type="button" onClick={() => alOrdenar(dir)} aria-pressed={ordenActual === dir}
      className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-2 py-1.5 text-[12px] font-medium transition-colors ${ordenActual === dir ? 'border-primary bg-primary/10 text-primary' : 'border-border text-foreground hover:bg-muted'}`}>
      <Icono className="size-3.5" />{etiqueta}
    </button>
  )
  const textoAsc = columna.tipo === 'texto' ? 'A → Z' : esFecha ? 'Antiguo' : 'Menor'
  const textoDesc = columna.tipo === 'texto' ? 'Z → A' : esFecha ? 'Reciente' : 'Mayor'

  return createPortal(
    <div ref={ref} role="dialog" aria-label={`Filtrar ${columna.etiqueta}`} style={{ left: posicion.left, top: posicion.top, width: ANCHO }}
      className="fixed z-[10000] flex max-h-[70vh] flex-col gap-3 rounded-2xl bg-card p-3 shadow-2xl ring-1 ring-border">
      <div className="flex gap-2">
        {botonOrden('asc', textoAsc, ArrowDownAZ)}
        {botonOrden('desc', textoDesc, ArrowUpAZ)}
      </div>

      {esRango && (
        <div className="space-y-1">
          <p className="text-[11.5px] font-medium text-muted-foreground">{esFecha ? 'Entre fechas' : 'Entre valores'}</p>
          <div className="flex items-center gap-2">
            <input aria-label="Desde" type={esFecha ? 'date' : 'number'} value={min} onChange={(e) => setMin(e.target.value)} placeholder="Mín." className={campoRango} />
            <input aria-label="Hasta" type={esFecha ? 'date' : 'number'} value={max} onChange={(e) => setMax(e.target.value)} placeholder="Máx." className={campoRango} />
          </div>
        </div>
      )}

      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <input aria-label="Buscar valor" autoFocus value={buscar} onChange={(e) => { setBuscar(e.target.value); setMarcados(null) }} placeholder="Buscar…"
          className="h-8 w-full rounded-lg border border-input bg-background pl-8 pr-2 text-[12.5px] text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
      </div>

      <div className="min-h-24 flex-1 overflow-y-auto rounded-lg border border-border/70">
        {consulta.isLoading && <p className="p-3 text-[12.5px] text-muted-foreground">Cargando valores…</p>}
        {consulta.isError && <p className="p-3 text-[12.5px] text-destructive">No se pudieron cargar los valores.</p>}
        {consulta.data && valores.length === 0 && <p className="p-3 text-[12.5px] text-muted-foreground">Sin coincidencias.</p>}
        {valores.length > 0 && (
          <ul>
            <li className="border-b border-border/70">
              <label className="flex cursor-pointer items-center gap-2 px-2.5 py-1.5 text-[12.5px] font-semibold hover:bg-muted">
                <input type="checkbox" checked={todosMarcados} onChange={alternarTodos} className="size-3.5 accent-primary" />
                {buscarRetrasado ? 'Seleccionar resultados' : 'Seleccionar todo'}
              </label>
            </li>
            {valores.map(({ valor, n }) => (
              <li key={valor}>
                <label className="flex cursor-pointer items-center gap-2 px-2.5 py-1 text-[12.5px] hover:bg-muted">
                  <input type="checkbox" checked={marcados === null || marcados.has(valor)} onChange={() => alternar(valor)} className="size-3.5 shrink-0 accent-primary" />
                  <span className={`min-w-0 flex-1 truncate ${valor === VACIO ? 'italic text-muted-foreground' : ''}`} title={etiquetaValor(valor, columna.tipo)}>{etiquetaValor(valor, columna.tipo)}</span>
                  <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">{entero(n)}</span>
                </label>
              </li>
            ))}
          </ul>
        )}
        {truncado && <p className="border-t border-border/70 p-2 text-[11.5px] text-muted-foreground">Hay más de 300 valores: escribe para acotar la lista.</p>}
      </div>

      <div className="flex justify-between gap-2">
        <button type="button" onClick={() => alAplicar(null)} className="rounded-lg px-3 py-1.5 text-[12.5px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground">
          Quitar filtro
        </button>
        <button type="button" onClick={aplicar} disabled={sinSeleccion} className="rounded-lg bg-primary px-4 py-1.5 text-[12.5px] font-semibold text-primary-foreground disabled:opacity-50">
          Aplicar
        </button>
      </div>
    </div>,
    document.body,
  )
}
