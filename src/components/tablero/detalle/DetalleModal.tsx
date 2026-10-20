import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Download, Funnel, Info, Loader2, X } from 'lucide-react'
import { clsx } from 'clsx'
import { entero } from '@/components/tablero/formato'
import { CalculandoGraficas } from '@/components/tablero/CalculandoGraficas'
import { useAuthStore } from '@/store/authStore'
import { obtenerDetalle, obtenerValores } from './api'
import { aCsv, formatearCelda, resumenFiltro } from './formato'
import { MenuFiltroColumna } from './MenuFiltroColumna'
import type { ColumnaDetalle, EspecDetalle, FiltroColumna, FiltrosColumna, RangoDetalle } from './tipos'

const TAMANOS = [25, 50, 100, 200, 500]
const ANCHO_MINIMO: Record<ColumnaDetalle['tipo'], string> = {
  texto: 'min-w-[9rem]', fecha: 'min-w-[6.5rem]', fechahora: 'min-w-[9rem]', entero: 'min-w-[5.5rem]',
  dinero: 'min-w-[8rem]', kg: 'min-w-[7rem]', dias: 'min-w-[5.5rem]', porcentaje: 'min-w-[6rem]',
}

const nombreArchivo = (titulo: string) =>
  `${titulo.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${new Date().toLocaleDateString('sv-SE')}.csv`

interface Props {
  espec: EspecDetalle
  rango?: RangoDetalle
  alCerrar: () => void
}

/** Tabla con los registros que componen una métrica: enumerada, con filtros por columna estilo Excel y totales. */
export function DetalleModal({ espec, rango, alCerrar }: Props) {
  const centroOperacion = useAuthStore((s) => s.centroOperacionActivo)
  const [cf, setCf] = useState<FiltrosColumna>(espec.cf ?? {})
  const [pagina, setPagina] = useState(1)
  const [tamano, setTamano] = useState(50)
  const [orden, setOrden] = useState(espec.orden ?? null)
  const [menu, setMenu] = useState<{ clave: string; ancla: DOMRect } | null>(null)
  const [exportando, setExportando] = useState(false)
  const [errorExportar, setErrorExportar] = useState(false)
  const dialogo = useRef<HTMLDivElement>(null)

  const claveBase = useMemo(() => ['dashboard-detalle', espec.conjunto, espec.filtros ?? {}, rango ?? null, centroOperacion], [espec, rango, centroOperacion])

  const consulta = useQuery({
    queryKey: [...claveBase, 'filas', cf, pagina, tamano, orden],
    queryFn: () => obtenerDetalle(espec, rango, cf, { pagina, tamano, orden }),
    placeholderData: keepPreviousData,
    staleTime: 2 * 60 * 1000,
  })
  const datos = consulta.data

  useEffect(() => {
    const anterior = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialogo.current?.focus()
    return () => { document.body.style.overflow = anterior }
  }, [])

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape' && !menu) alCerrar() }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [alCerrar, menu])

  const aplicarFiltro = useCallback((clave: string, filtro: FiltroColumna | null) => {
    setCf((actual) => {
      const siguiente = { ...actual }
      if (filtro) siguiente[clave] = filtro
      else delete siguiente[clave]
      return siguiente
    })
    setPagina(1)
    setMenu(null)
  }, [])

  const ordenar = (clave: string, dir: 'asc' | 'desc') => { setOrden({ clave, dir }); setPagina(1); setMenu(null) }
  const alternarOrden = (clave: string) => {
    const actual = orden?.clave === clave ? orden.dir : datos?.orden === clave && !orden ? datos.dir : null
    ordenar(clave, actual === 'asc' ? 'desc' : 'asc')
  }

  const abrirMenu = (clave: string, e: React.MouseEvent<HTMLButtonElement>) => {
    const ancla = e.currentTarget.getBoundingClientRect()
    setMenu((actual) => (actual?.clave === clave ? null : { clave, ancla }))
  }

  const columnas = datos?.columnas ?? []
  const columnaMenu = menu ? columnas.find((c) => c.clave === menu.clave) : undefined
  const cfSinMenu = useMemo(() => Object.fromEntries(Object.entries(cf).filter(([clave]) => clave !== menu?.clave)), [cf, menu?.clave])
  const filtrosActivos = Object.entries(cf)
  const ordenVisible = orden ?? (datos ? { clave: datos.orden, dir: datos.dir } : null)

  const exportar = async () => {
    setExportando(true)
    setErrorExportar(false)
    try {
      const todo = await obtenerDetalle(espec, rango, cf, { pagina: 1, tamano, orden }, true)
      const url = URL.createObjectURL(new Blob([aCsv(todo.columnas, todo.filas)], { type: 'text/csv;charset=utf-8' }))
      const enlace = document.createElement('a')
      enlace.href = url
      enlace.download = nombreArchivo(espec.titulo)
      enlace.click()
      URL.revokeObjectURL(url)
    } catch {
      setErrorExportar(true)
    } finally {
      setExportando(false)
    }
  }

  const totalPaginas = datos ? Math.max(1, Math.ceil(datos.total / datos.tamano)) : 1
  const primera = datos && datos.total > 0 ? (datos.pagina - 1) * datos.tamano + 1 : 0
  const ultima = datos ? Math.min(datos.total, datos.pagina * datos.tamano) : 0

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4">
      <div className="absolute inset-0 bg-black/55" onClick={alCerrar} aria-hidden />
      <div ref={dialogo} role="dialog" aria-modal="true" aria-label={espec.titulo} tabIndex={-1}
        className="relative flex h-[94vh] w-full max-w-[1600px] flex-col overflow-hidden rounded-3xl bg-card shadow-2xl ring-1 ring-border outline-none">
        <header className="flex items-start justify-between gap-3 border-b border-border/70 px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <h2 className="text-[17px] font-semibold text-foreground">{espec.titulo}</h2>
            {espec.valor && <p className="mt-0.5 text-[13px] text-muted-foreground">Valor en la tarjeta: <span className="font-semibold text-foreground tabular-nums">{espec.valor}</span></p>}
          </div>
          <button type="button" onClick={alCerrar} aria-label="Cerrar" className="rounded-xl p-2 text-muted-foreground hover:bg-muted hover:text-foreground">
            <X className="size-5" />
          </button>
        </header>

        <div className="space-y-2 border-b border-border/70 px-5 py-3 sm:px-6">
          <p className="flex items-start gap-2 text-[12.5px] leading-relaxed text-muted-foreground">
            <Info className="mt-0.5 size-3.5 shrink-0" />
            <span><span className="font-semibold text-foreground">Estos registros salen de: </span>{datos?.fuente ?? 'consultando…'}</span>
          </p>
          {espec.explicacion && (
            <p className="pl-5 text-[12.5px] leading-relaxed text-muted-foreground"><span className="font-semibold text-foreground">Cómo se calcula: </span>{espec.explicacion}</p>
          )}
          {(espec.filtrosTexto?.length || filtrosActivos.length > 0) && (
            <div className="flex flex-wrap items-center gap-1.5 pl-5">
              {espec.filtrosTexto?.map((texto) => (
                <span key={texto} className="rounded-full bg-muted px-2.5 py-1 text-[12px] font-medium text-foreground/80">{texto}</span>
              ))}
              {filtrosActivos.map(([clave, f]) => {
                const columna = columnas.find((c) => c.clave === clave)
                if (!columna) return null
                return (
                  <span key={clave} className="inline-flex items-center gap-1 rounded-full bg-primary/10 py-1 pl-2.5 pr-1 text-[12px] font-medium text-primary">
                    {resumenFiltro(columna, f)}
                    <button type="button" aria-label={`Quitar filtro de ${columna.etiqueta}`} onClick={() => aplicarFiltro(clave, null)} className="rounded-full p-0.5 hover:bg-primary/20">
                      <X className="size-3" />
                    </button>
                  </span>
                )
              })}
              {filtrosActivos.length > 1 && (
                <button type="button" onClick={() => { setCf({}); setPagina(1) }} className="px-1.5 text-[12px] font-medium text-muted-foreground underline hover:text-foreground">
                  Quitar todos
                </button>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-2.5 sm:px-6">
          <p className="text-[13px] text-muted-foreground" aria-live="polite">
            {datos ? <>
              <span className="font-semibold text-foreground tabular-nums">{entero(datos.total)}</span> registros
              {datos.total !== datos.totalSinFiltrarColumnas && <> de {entero(datos.totalSinFiltrarColumnas)}</>}
            </> : 'Cargando…'}
            {consulta.isFetching && datos && <Loader2 className="ml-2 inline size-3.5 animate-spin" aria-label="Actualizando" />}
          </p>
          <div className="flex items-center gap-2">
            {errorExportar && <span role="alert" className="text-[12px] text-destructive">No se pudo exportar</span>}
            <button type="button" onClick={exportar} disabled={exportando || !datos || datos.total === 0}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-[12.5px] font-medium text-foreground hover:bg-muted disabled:opacity-50">
              {exportando ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
              Exportar a Excel (CSV)
            </button>
          </div>
        </div>

        <div className={clsx('relative min-h-0 flex-1 overflow-auto border-t border-border/70', consulta.isFetching && datos && 'opacity-70 transition-opacity')}>
          {consulta.isError && !datos && (
            <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
              <p className="text-[14px] text-destructive">No se pudo cargar el detalle</p>
              <button type="button" onClick={() => void consulta.refetch()} className="rounded-xl border border-border px-3 py-1.5 text-[12.5px] font-medium hover:bg-muted">Reintentar</button>
            </div>
          )}
          {!datos && !consulta.isError && <CalculandoGraficas altura="h-full" className="rounded-none" />}
          {datos && (
            <table className="w-full border-separate border-spacing-0 text-[13px]">
              <thead>
                <tr>
                  <th scope="col" className="sticky left-0 top-0 z-30 w-12 border-b border-border bg-muted px-3 py-2.5 text-right text-[12px] font-semibold text-muted-foreground">#</th>
                  {columnas.map((c) => {
                    const activo = !!cf[c.clave]
                    const ordenado = ordenVisible?.clave === c.clave ? ordenVisible.dir : null
                    return (
                      <th key={c.clave} scope="col" aria-sort={ordenado === 'asc' ? 'ascending' : ordenado === 'desc' ? 'descending' : 'none'}
                        className={clsx('sticky top-0 z-20 whitespace-nowrap border-b border-border bg-muted px-2 py-1.5 text-[12px] font-semibold text-muted-foreground', ANCHO_MINIMO[c.tipo])}>
                        <div className={clsx('flex items-center gap-1', c.tipo !== 'texto' && c.tipo !== 'fecha' && c.tipo !== 'fechahora' && 'justify-end')}>
                          <button type="button" onClick={() => alternarOrden(c.clave)} className="inline-flex items-center gap-1 rounded px-1 py-0.5 hover:text-foreground" title="Ordenar">
                            {c.etiqueta}
                            {ordenado === 'asc' && <ArrowUp className="size-3" />}
                            {ordenado === 'desc' && <ArrowDown className="size-3" />}
                          </button>
                          <button type="button" onClick={(e) => abrirMenu(c.clave, e)} aria-label={`Filtrar ${c.etiqueta}`} aria-expanded={menu?.clave === c.clave}
                            className={clsx('rounded p-1 transition-colors', activo ? 'bg-primary text-primary-foreground' : 'text-muted-foreground/70 hover:bg-card hover:text-foreground')}>
                            <Funnel className="size-3" />
                          </button>
                        </div>
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {datos.filas.map((fila, i) => (
                  <tr key={`${datos.pagina}-${i}`} className="group">
                    <td className="sticky left-0 z-10 border-b border-border/60 bg-card px-3 py-2 text-right text-[12px] tabular-nums text-muted-foreground group-hover:bg-muted">
                      {entero((datos.pagina - 1) * datos.tamano + i + 1)}
                    </td>
                    {columnas.map((c) => {
                      const texto = formatearCelda(fila[c.clave], c.tipo)
                      const numerica = c.tipo !== 'texto' && c.tipo !== 'fecha' && c.tipo !== 'fechahora'
                      return (
                        <td key={c.clave} title={c.tipo === 'texto' ? texto : undefined}
                          className={clsx('whitespace-nowrap border-b border-border/60 px-3 py-2 text-foreground/85 group-hover:bg-muted', numerica ? 'text-right tabular-nums' : 'max-w-[22rem] truncate', texto === '—' && 'text-muted-foreground/60')}>
                          {texto}
                        </td>
                      )
                    })}
                  </tr>
                ))}
                {datos.filas.length === 0 && (
                  <tr><td colSpan={columnas.length + 1} className="px-4 py-16 text-center text-[14px] text-muted-foreground">No hay registros con estos filtros.</td></tr>
                )}
              </tbody>
              {columnas.some((c) => c.sumar || c.razon) && datos.filas.length > 0 && (
                <tfoot>
                  <tr>
                    <td className="sticky bottom-0 left-0 z-30 border-t border-border bg-muted px-3 py-2.5" />
                    {columnas.map((c, i) => {
                      const total = datos.totales[c.clave]
                      const numerica = c.tipo !== 'texto' && c.tipo !== 'fecha' && c.tipo !== 'fechahora'
                      return (
                        <td key={c.clave} className={clsx('sticky bottom-0 z-20 whitespace-nowrap border-t border-border bg-muted px-3 py-2.5 text-[13px] font-semibold text-foreground', numerica && 'text-right tabular-nums')}>
                          {total != null ? formatearCelda(total, c.tipo) : i === 0 ? `Total · ${entero(datos.total)} registros` : ''}
                        </td>
                      )
                    })}
                  </tr>
                </tfoot>
              )}
            </table>
          )}
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 px-5 py-2.5 sm:px-6">
          <label className="flex items-center gap-2 text-[12.5px] text-muted-foreground">
            Filas por página
            <select value={tamano} onChange={(e) => { setTamano(Number(e.target.value)); setPagina(1) }}
              className="h-8 rounded-lg border border-input bg-background px-2 text-[12.5px] text-foreground">
              {TAMANOS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
          <div className="flex items-center gap-2 text-[12.5px] text-muted-foreground">
            <span className="tabular-nums">{entero(primera)}–{entero(ultima)} de {entero(datos?.total ?? 0)}</span>
            <button type="button" onClick={() => setPagina((p) => Math.max(1, p - 1))} disabled={pagina <= 1} aria-label="Página anterior"
              className="rounded-lg border border-border p-1.5 text-foreground hover:bg-muted disabled:opacity-40"><ChevronLeft className="size-4" /></button>
            <span className="tabular-nums">Página {entero(pagina)} de {entero(totalPaginas)}</span>
            <button type="button" onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))} disabled={pagina >= totalPaginas} aria-label="Página siguiente"
              className="rounded-lg border border-border p-1.5 text-foreground hover:bg-muted disabled:opacity-40"><ChevronRight className="size-4" /></button>
          </div>
        </footer>
      </div>

      {menu && columnaMenu && (
        <MenuFiltroColumna
          key={menu.clave}
          columna={columnaMenu}
          filtro={cf[menu.clave]}
          ordenActual={ordenVisible?.clave === menu.clave ? ordenVisible.dir : null}
          ancla={menu.ancla}
          claveValores={[...claveBase, 'valores', cfSinMenu]}
          cargarValores={(buscar) => obtenerValores(espec, rango, cfSinMenu, menu.clave, buscar)}
          alOrdenar={(dir) => ordenar(menu.clave, dir)}
          alAplicar={(filtro) => aplicarFiltro(menu.clave, filtro)}
          alCerrar={() => setMenu(null)}
        />
      )}
    </div>,
    document.body,
  )
}
