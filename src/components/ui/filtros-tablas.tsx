import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Search } from 'lucide-react'
import {
  MARCA_FILTRADA, aplicarFiltros, columnaFiltrable, esFilaDetalle, filaEncabezado, filasCuerpo, hayFiltros,
  tablaFiltrable, textoCelda, valoresColumna, type EstadoFiltros,
} from '@/utils/filtrosTablas'

const ICONO_FILTRO =
  '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>'

function crearBoton(col: number): HTMLButtonElement {
  const b = document.createElement('button')
  b.type = 'button'
  b.setAttribute('data-filtro-btn', String(col))
  b.setAttribute('aria-label', 'Filtrar columna')
  b.title = 'Filtrar columna'
  b.className =
    'ml-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded align-middle font-normal text-muted-foreground/60 hover:bg-muted hover:text-foreground data-[activo=true]:bg-primary/10 data-[activo=true]:text-primary'
  b.innerHTML = ICONO_FILTRO
  return b
}

type Abierto = { tabla: HTMLTableElement; col: number; x: number; y: number }

/**
 * Filtros por columna estilo Excel en todas las tablas de la pantalla: un embudo en cada encabezado abre la
 * lista de valores con casillas y búsqueda. Se monta una sola vez en el layout; las tablas que no deben
 * tenerlo llevan `data-sin-filtros`. Filtra lo que la tabla muestra (con paginación, la página en curso).
 */
export function FiltrosTablas() {
  const estados = useRef(new WeakMap<HTMLTableElement, EstadoFiltros>())
  const [abierto, setAbierto] = useState<Abierto | null>(null)
  const [, redibujar] = useState(0)

  const estadoDe = useCallback((tabla: HTMLTableElement) => {
    let e = estados.current.get(tabla)
    if (!e) { e = new Map(); estados.current.set(tabla, e) }
    return e
  }, [])

  const marcarBotones = useCallback((tabla: HTMLTableElement) => {
    const enc = filaEncabezado(tabla)
    if (!enc) return
    const estado = estados.current.get(tabla)
    Array.from(enc.children).forEach((th, i) => {
      th.querySelector(':scope > [data-filtro-btn]')?.setAttribute('data-activo', String((estado?.get(i)?.size ?? 0) > 0))
    })
  }, [])

  // Pone el embudo en cada encabezado y vuelve a aplicar los filtros cuando React cambia las filas
  useEffect(() => {
    const escanear = () => {
      document.querySelectorAll<HTMLTableElement>('table').forEach((tabla) => {
        if (tabla.closest('[data-filtros-panel]') || !tablaFiltrable(tabla)) return
        const enc = filaEncabezado(tabla)
        if (!enc) return
        Array.from(enc.children).forEach((th, i) => {
          if (columnaFiltrable(th) && !th.querySelector(':scope > [data-filtro-btn]')) th.appendChild(crearBoton(i))
        })
        const estado = estados.current.get(tabla)
        if (estado && hayFiltros(estado)) aplicarFiltros(tabla, estado)
        marcarBotones(tabla)
      })
    }
    let timer = 0
    const programar = (muts: MutationRecord[]) => {
      const propias = muts.every((m) => {
        const el = m.target.nodeType === 1 ? (m.target as Element) : m.target.parentElement
        return !!el?.closest('[data-filtros-panel]')
      })
      if (propias || timer) return
      timer = window.setTimeout(() => { timer = 0; escanear() }, 120)
    }
    const obs = new MutationObserver(programar)
    obs.observe(document.body, { childList: true, subtree: true, characterData: true })
    escanear()

    // El embudo no debe disparar el orden o el clic del encabezado que lo contiene
    const alClic = (e: MouseEvent) => {
      const b = (e.target as Element | null)?.closest?.('[data-filtro-btn]')
      const tabla = b?.closest('table')
      if (!b || !tabla) return
      e.preventDefault()
      e.stopPropagation()
      const col = Number(b.getAttribute('data-filtro-btn'))
      const r = b.getBoundingClientRect()
      setAbierto((prev) => (prev && prev.tabla === tabla && prev.col === col ? null : { tabla, col, x: r.left, y: r.bottom + 4 }))
    }
    document.addEventListener('click', alClic, true)
    return () => {
      obs.disconnect()
      window.clearTimeout(timer)
      document.removeEventListener('click', alClic, true)
    }
  }, [marcarBotones])

  if (!abierto || !abierto.tabla.isConnected) return null
  return createPortal(
    <PanelFiltro
      key={`${abierto.col}`}
      abierto={abierto}
      estado={estadoDe(abierto.tabla)}
      onCambio={() => { marcarBotones(abierto.tabla); redibujar((n) => n + 1) }}
      onCerrar={() => setAbierto(null)}
    />,
    document.body,
  )
}

function PanelFiltro({ abierto, estado, onCambio, onCerrar }: {
  abierto: Abierto
  estado: EstadoFiltros
  onCambio: () => void
  onCerrar: () => void
}) {
  const { tabla, col } = abierto
  const panel = useRef<HTMLDivElement>(null)
  const [busqueda, setBusqueda] = useState('')

  useEffect(() => {
    const fuera = (e: MouseEvent) => {
      const el = e.target as Element
      if (!panel.current?.contains(el) && !el.closest('[data-filtro-btn]')) onCerrar()
    }
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') onCerrar() }
    const scroll = (e: Event) => { if (!panel.current?.contains(e.target as Node)) onCerrar() }
    document.addEventListener('mousedown', fuera)
    document.addEventListener('keydown', tecla)
    window.addEventListener('scroll', scroll, true)
    return () => {
      document.removeEventListener('mousedown', fuera)
      document.removeEventListener('keydown', tecla)
      window.removeEventListener('scroll', scroll, true)
    }
  }, [onCerrar])

  const titulo = textoCelda(filaEncabezado(tabla)?.children[col])
  const excluidos = estado.get(col) ?? new Set<string>()
  const valores = valoresColumna(tabla, col, estado)
  const q = busqueda.trim().toLowerCase()
  const listados = q ? valores.filter((v) => v.toLowerCase().includes(q)) : valores
  const todos = listados.length > 0 && listados.every((v) => !excluidos.has(v))

  const guardar = (nuevo: Set<string>) => {
    if (nuevo.size === 0) estado.delete(col)
    else estado.set(col, nuevo)
    aplicarFiltros(tabla, estado)
    onCambio()
  }
  const alternar = (v: string) => {
    const nuevo = new Set(excluidos)
    if (nuevo.has(v)) nuevo.delete(v)
    else nuevo.add(v)
    guardar(nuevo)
  }
  const alternarTodos = () => {
    const nuevo = new Set(excluidos)
    for (const v of listados) {
      if (todos) nuevo.add(v)
      else nuevo.delete(v)
    }
    guardar(nuevo)
  }
  const borrarTodos = () => { estado.clear(); aplicarFiltros(tabla, estado); onCambio() }

  const datos = filasCuerpo(tabla).filter((f) => !esFilaDetalle(f))
  const visibles = datos.filter((f) => !f.hasAttribute(MARCA_FILTRADA)).length
  const left = Math.max(8, Math.min(abierto.x, window.innerWidth - 272))
  const top = Math.max(8, Math.min(abierto.y, window.innerHeight - 380))

  return (
    <div
      ref={panel}
      data-filtros-panel
      style={{ left, top }}
      className="fixed z-[1000] w-64 rounded-lg border bg-popover p-2 text-sm text-popover-foreground shadow-lg"
    >
      <p className="px-1 pb-1.5 text-xs font-medium text-muted-foreground">Filtrar «{titulo}»</p>
      <div className="relative">
        <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          autoFocus
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar"
          className="h-8 w-full rounded-md border bg-background pl-7 pr-2 text-xs outline-none focus:ring-1 focus:ring-primary"
        />
      </div>
      <div className="mt-1.5 max-h-60 overflow-auto rounded-md border">
        {listados.length === 0 ? (
          <p className="p-2 text-xs text-muted-foreground">Sin coincidencias</p>
        ) : (
          <>
            <label className="flex cursor-pointer items-center gap-2 border-b px-2 py-1 text-xs font-medium hover:bg-muted">
              <input type="checkbox" checked={todos} onChange={alternarTodos} className="accent-primary" />
              (Seleccionar todo)
            </label>
            {listados.map((v) => (
              <label key={v} className="flex cursor-pointer items-center gap-2 px-2 py-1 text-xs hover:bg-muted">
                <input type="checkbox" checked={!excluidos.has(v)} onChange={() => alternar(v)} className="accent-primary" />
                <span className="truncate" title={v}>{v}</span>
              </label>
            ))}
          </>
        )}
      </div>
      <div className="mt-2 flex items-center justify-between gap-2 text-xs">
        <span className="text-muted-foreground">{visibles} de {datos.length} filas</span>
        <span className="flex gap-2">
          {excluidos.size > 0 && (
            <button type="button" className="text-primary hover:underline" onClick={() => guardar(new Set())}>
              Borrar filtro
            </button>
          )}
          {estado.size > (excluidos.size > 0 ? 1 : 0) && (
            <button type="button" className="text-primary hover:underline" onClick={borrarTodos}>
              Borrar todos
            </button>
          )}
        </span>
      </div>
    </div>
  )
}
