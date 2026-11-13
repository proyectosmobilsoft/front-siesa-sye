import { Fragment, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronRight, MapPin, Search, Receipt, MapPinned } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { hoyLocalIso, useFechasLimite } from '@/hooks/useFechasLimite'
import { CuerpoConsulta, SelectorRango, Tarjeta } from '@/components/tablero/comun'
import { rangoDePreset, type PresetRango } from '@/components/tablero/formato'
import { logisticaApi, type ConductorUbicacion, type ReciboUbicacion } from '@/api/logistica'
import { useCuadrantesLogistica } from '@/components/logistica/useLogistica'
import { MapaUbicacionRc } from '@/components/logistica/MapaUbicacionRc'
import { CondicionPagoChip } from '@/components/asignacionCobro/CondicionPagoChip'
import { formatters } from '@/utils/formatters'

const CONDUCTORES_POR_PAGINA = 8
const RECIBOS_POR_PAGINA = 10

function Paginador({ pagina, total, cantidad, porPagina, alCambiar, etiqueta }: { pagina: number; total: number; cantidad: number; porPagina: number; alCambiar: (p: number) => void; etiqueta: ReactNode }) {
  if (total <= 1) return null
  return <div className="flex items-center justify-between gap-2 px-1 py-2 text-xs text-muted-foreground">
    <span className="tabular-nums">{(pagina - 1) * porPagina + 1}–{Math.min(pagina * porPagina, cantidad)} de {cantidad} {etiqueta}</span>
    <span className="flex items-center gap-1">
      <button type="button" disabled={pagina <= 1} onClick={() => alCambiar(pagina - 1)} className="rounded-lg px-2.5 py-1 font-medium hover:bg-muted disabled:opacity-40">Anterior</button>
      <span className="tabular-nums">{pagina}/{total}</span>
      <button type="button" disabled={pagina >= total} onClick={() => alCambiar(pagina + 1)} className="rounded-lg px-2.5 py-1 font-medium hover:bg-muted disabled:opacity-40">Siguiente</button>
    </span>
  </div>
}

const MEDIOS: [string, string][] = [['EF', 'Efectivo'], ['CG', 'Transferencia'], ['TR', 'Transferencia'], ['TC', 'Tarjeta crédito'], ['TD', 'Tarjeta débito'], ['CH', 'Cheque']]
const nombreMedio = (id: string) => MEDIOS.find(([p]) => id.toUpperCase().startsWith(p))?.[1] ?? id
const fechaCorta = (f: string | null) => (f ? `${f.slice(8, 10)}/${f.slice(5, 7)}/${f.slice(0, 4)}` : '—')

/** Lo que se pagó en el RC: facturas cruzadas (con condición de pago y vencimiento) y medios de pago. */
function DetalleRc({ rowid }: { rowid: number }) {
  const q = useQuery({ queryKey: ['logistica', 'ubicacion-rc', 'detalle', rowid], queryFn: () => logisticaApi.detalleUbicacionRc(rowid), staleTime: 5 * 60_000 })
  if (q.isLoading) return <div className="bg-muted/30 px-4 py-3 text-xs text-muted-foreground">Cargando detalle…</div>
  if (q.isError || !q.data) return <div className="bg-muted/30 px-4 py-3 text-xs text-destructive">No se pudo cargar el detalle del RC.</div>
  const d = q.data
  return <div className="space-y-3 bg-muted/30 px-4 py-3 text-xs">
    <div>
      <p className="mb-1.5 font-semibold uppercase tracking-wide text-muted-foreground">Facturas pagadas ({d.facturas.length})</p>
      {d.facturas.length === 0 ? <p className="text-muted-foreground">Sin facturas cruzadas (anticipo).</p> :
        <div className="space-y-1.5">{d.facturas.map(f => <div key={f.factura} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-card px-3 py-2 ring-1 ring-border/60">
          <span className="min-w-0">
            <span className="font-mono font-semibold">{f.factura}</span>
            <span className="ml-2 text-muted-foreground">emitida {fechaCorta(f.emision)} · vence {fechaCorta(f.vence)}</span>
            <span className="mt-1 block"><CondicionPagoChip id={f.condicion_pago_id} descripcion={f.condicion_pago} /></span>
          </span>
          <span className="text-right tabular-nums">
            <span className="block font-semibold">{formatters.currency(f.aplicado)}</span>
            {f.descuento_pp > 0 && <span className="block text-emerald-700 dark:text-emerald-300">desc. pronto pago {formatters.currency(f.descuento_pp)}</span>}
          </span>
        </div>)}</div>}
    </div>
    <div className="flex flex-wrap gap-2">
      {d.medios_pago.map(m => <span key={m.medio} className="rounded-full bg-card px-2.5 py-1 ring-1 ring-border/60"><b>{nombreMedio(m.medio)}</b> <span className="text-muted-foreground">({m.medio})</span> {formatters.currency(m.valor)}</span>)}
    </div>
    {d.notas && <p className="break-words text-muted-foreground"><b className="text-foreground/80">Notas:</b> {d.notas}</p>}
  </div>
}

type Filtro = 'todos' | 'ubicados' | 'sin'
const motivos: Record<string, string> = {
  SIN_PERMISO: 'Sin permiso', GPS_APAGADO: 'GPS apagado', SIN_FIX: 'Sin señal GPS',
  INVALIDA: 'Dato inválido', SIN_DATO: 'Sin dato: app vieja o RC de la web',
}
const porcentaje = (parte: number, total: number) => total ? Math.round(100 * parte / total) : 0
const hora = (fecha: string) => fecha?.slice(11, 16) || '—'
/** Un conductor = una cuenta de la app; sin cuenta conocida, el usuario SIESA. */
const claveConductor = (c: ConductorUbicacion) => c.conductor_id != null ? `app:${c.conductor_id}` : `siesa:${c.usuario_siesa}`
const conPunto = (r: ReciboUbicacion): r is ReciboUbicacion & { ubicacion: NonNullable<ReciboUbicacion['ubicacion']> } =>
  r.ubicacion != null && Number.isFinite(r.ubicacion.lat) && Number.isFinite(r.ubicacion.lon)

export const UbicacionRcPage = () => {
  const coActivo = useAuthStore(s => s.centroOperacionActivo)
  const sesion = useAuthStore(s => s.sesion)
  const centros = sesion?.centros_operacion ?? []
  const [coElegido, setCoElegido] = useState('')
  const co = coActivo === 'AMBOS' ? (centros.includes(coElegido) ? coElegido : centros[0] || '') : coActivo || ''
  const [rango, setRango] = useState(() => ({ desde: hoyLocalIso(), hasta: hoyLocalIso() }))
  const [preset, setPreset] = useState<PresetRango | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [filtro, setFiltro] = useState<Filtro>('todos')
  const [abierto, setAbierto] = useState<string | null>(null)
  const [seleccionado, setSeleccionado] = useState<number | null>(null)
  // Periodos largos: los totales van arriba; las listas se paginan
  const [paginaConductores, setPaginaConductores] = useState(1)
  const [paginaRecibos, setPaginaRecibos] = useState(1)
  const { data: limites } = useFechasLimite()
  const valido = !!co && !!rango.desde && !!rango.hasta && rango.desde <= rango.hasta
  const consulta = useQuery({
    queryKey: ['logistica', 'ubicacion-rc', rango.desde, rango.hasta, co],
    queryFn: () => logisticaApi.ubicacionRc({ fechaInicial: rango.desde, fechaFinal: rango.hasta, idCo: co }),
    enabled: valido,
    // Tablero en vivo: los RC nuevos y su GPS aparecen solos (el API cachea 20 s)
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  })
  const cuadrantesQ = useCuadrantesLogistica(co)
  const cuadrantes = useMemo(() => (cuadrantesQ.data ?? []).filter(c => c.id_co === co), [cuadrantesQ.data, co])
  const conductores = useMemo(() => consulta.data?.conductores ?? [], [consulta.data])
  const todos = conductores.flatMap(c => c.recibos)
  const ubicados = todos.filter(conPunto).length
  const visibles = useMemo(() => conductores.map(c => ({
    ...c,
    recibos: c.recibos.filter(r => filtro === 'todos' || (filtro === 'ubicados' ? conPunto(r) : !conPunto(r))),
  })).filter(c => c.recibos.length && `${c.conductor_nombre} ${c.usuario_app ?? ''} ${c.usuario_siesa}`.toLocaleLowerCase().includes(busqueda.trim().toLocaleLowerCase())), [conductores, filtro, busqueda])
  useEffect(() => { setPaginaConductores(1) }, [consulta.data, filtro, busqueda])
  useEffect(() => { setPaginaRecibos(1) }, [abierto, consulta.data, filtro])
  const totalPaginasConductores = Math.max(1, Math.ceil(visibles.length / CONDUCTORES_POR_PAGINA))
  const valorTotal = todos.reduce((suma, r) => suma + r.valor, 0)
  const conductorAbierto = visibles.find(c => claveConductor(c) === abierto)
  const puntos = useMemo(() => (conductorAbierto ? conductorAbierto.recibos : visibles.flatMap(c => c.recibos)).filter(conPunto), [conductorAbierto, visibles])
  const seleccionadoVisible = puntos.some(r => r.rowid_rc === seleccionado) ? seleccionado : null

  return <section className="mx-auto max-w-[1600px] space-y-5 p-4 sm:p-6">
    <div className="[&>div]:!mb-0">
      <SelectorRango preset={preset} desde={rango.desde} hasta={rango.hasta}
        min={limites?.recibos_app ?? undefined} max={hoyLocalIso()}
        alElegirPreset={p => { setPreset(p); setRango(rangoDePreset(p)); setSeleccionado(null) }}
        alCambiarDesde={v => { setPreset(null); setRango(r => ({ ...r, desde: v })); setSeleccionado(null) }}
        alCambiarHasta={v => { setPreset(null); setRango(r => ({ ...r, hasta: v })); setSeleccionado(null) }}
        extra={<>
          {coActivo === 'AMBOS'
            ? <select aria-label="Centro de operación" className="h-10 rounded-xl border border-border bg-background px-3 text-sm text-foreground" value={co}
                onChange={e => { setCoElegido(e.target.value); setAbierto(null); setSeleccionado(null) }}>
                {centros.map(c => <option key={c} value={c}>C.O. {c}</option>)}
              </select>
            : <span className="flex h-10 items-center rounded-xl bg-muted px-3 text-sm">C.O. {co || '—'}</span>}
          <label className="relative w-44">
            <span className="sr-only">Buscar conductor</span>
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Conductor"
              className="h-10 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
          </label>
          <div className="flex gap-1 rounded-xl bg-muted p-1" role="group" aria-label="Filtrar ubicación">
            {([['todos', 'Todos'], ['ubicados', 'Con ubicación'], ['sin', 'Sin ubicación']] as const).map(([clave, texto]) =>
              <button key={clave} type="button" aria-pressed={filtro === clave} onClick={() => { setFiltro(clave); setSeleccionado(null) }}
                className={`whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-medium ${filtro === clave ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>{texto}</button>)}
          </div>
        </>} />
    </div>
    <CuerpoConsulta consulta={{ isLoading: consulta.isLoading, isError: consulta.isError }}
      vacio={!valido || todos.length === 0}
      mensajeVacio={!valido ? 'Seleccione un C.O. y un rango de fechas válido' : 'Sin recibos de la app en este periodo'} altura="h-80">
      <>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Tarjeta etiqueta="RC del periodo" valor={formatters.number(todos.length)} icono={Receipt} compacta />
          <Tarjeta etiqueta="Con ubicación" valor={`${formatters.number(ubicados)} (${porcentaje(ubicados, todos.length)}%)`} icono={MapPinned} tono="ok" compacta />
          <Tarjeta etiqueta="Sin ubicación" valor={formatters.number(todos.length - ubicados)} icono={MapPin} tono="neutro" compacta />
          <Tarjeta etiqueta="Valor recaudado" valor={formatters.currency(valorTotal)} icono={Receipt} compacta />
        </div>
        <div className="grid gap-5 lg:grid-cols-12 lg:items-start">
          <div className="space-y-2 lg:col-span-5">
            <h2 className="text-sm font-semibold">Conductores ({visibles.length})</h2>
            {visibles.length === 0 && <p className="rounded-2xl bg-card p-8 text-center text-sm text-muted-foreground ring-1 ring-border/80">Sin recibos para estos filtros</p>}
            {visibles.slice((paginaConductores - 1) * CONDUCTORES_POR_PAGINA, paginaConductores * CONDUCTORES_POR_PAGINA).map(c => {
              const cantidad = c.recibos.length
              const conUbicacion = c.recibos.filter(conPunto).length
              const estaAbierto = abierto === claveConductor(c)
              return <div key={claveConductor(c)} className="overflow-hidden rounded-2xl bg-card ring-1 ring-border/80">
                <button type="button" aria-expanded={estaAbierto} onClick={() => { setAbierto(estaAbierto ? null : claveConductor(c)); setSeleccionado(null) }}
                  className={`flex w-full items-center gap-3 p-4 text-left hover:bg-muted/30 ${estaAbierto ? 'bg-primary/5' : ''}`}>
                  <ChevronRight className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${estaAbierto ? 'rotate-90' : ''}`} />
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">{c.conductor_nombre?.charAt(0) || '?'}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{c.conductor_nombre || c.usuario_siesa}</span>
                    <span className="block truncate text-[11px] text-muted-foreground">
                      {c.usuario_app ? <>App: <b className="font-medium text-foreground/80">{c.usuario_app}</b> · </> : null}SIESA: {c.usuario_siesa}
                      {(c.cuentas_compartidas?.length ?? 0) > 1 && <span className="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-amber-900 dark:bg-amber-500/20 dark:text-amber-200" title={`Usuario SIESA compartido por: ${c.cuentas_compartidas.join(', ')}`}>SIESA compartido</span>}
                    </span>
                    <span className="block text-xs text-muted-foreground">{cantidad} RC · {porcentaje(conUbicacion, cantidad)}% con ubicación · {formatters.currency(c.recibos.reduce((s, r) => s + r.valor, 0))}</span>
                    <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-muted"><span className="block h-full rounded-full bg-emerald-500" style={{ width: `${porcentaje(conUbicacion, cantidad)}%` }} /></span>
                  </span>
                </button>
                {estaAbierto && <div className="divide-y divide-border/60 border-t border-border/60">
                  {c.recibos.slice((paginaRecibos - 1) * RECIBOS_POR_PAGINA, paginaRecibos * RECIBOS_POR_PAGINA).map(r => {
                    const aproximada = conPunto(r) && (r.ubicacion.fuente === 'ULTIMA_CONOCIDA' || r.ubicacion.simulada)
                    return <Fragment key={r.rowid_rc}><button type="button" aria-expanded={seleccionado === r.rowid_rc}
                      onClick={() => setSeleccionado(seleccionado === r.rowid_rc ? null : r.rowid_rc)}
                      className={`flex w-full flex-col gap-1.5 px-4 py-3 text-left text-sm hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between ${seleccionado === r.rowid_rc ? 'bg-primary/10 ring-1 ring-inset ring-primary/30' : ''}`}>
                      <span className="min-w-0"><span className="font-semibold">{r.id_co}-{r.numero_rc}</span><span className="ml-2 text-xs text-muted-foreground">{hora(r.fecha)}</span>
                        <span className="block truncate text-xs text-muted-foreground">{r.cliente}</span></span>
                      <span className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end"><span className="font-medium tabular-nums">{formatters.currency(r.valor)}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${aproximada ? 'bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-200' : conPunto(r) ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200' : 'bg-muted text-muted-foreground'}`}>
                          {aproximada ? 'Aproximada' : conPunto(r) ? `Ubicado${r.ubicacion.precision_m != null ? ` ±${Math.round(r.ubicacion.precision_m)}m` : ''}` : `Sin ubicación · ${motivos[r.motivo_sin_ubicacion ?? 'SIN_DATO'] ?? 'Sin dato'}`}
                        </span>
                      </span>
                    </button>
                    {seleccionado === r.rowid_rc && <DetalleRc rowid={r.rowid_rc} />}
                    </Fragment>
                  })}
                  <div className="px-3"><Paginador pagina={paginaRecibos} total={Math.ceil(c.recibos.length / RECIBOS_POR_PAGINA)} cantidad={c.recibos.length} porPagina={RECIBOS_POR_PAGINA} alCambiar={setPaginaRecibos} etiqueta="RC" /></div>
                </div>}
              </div>
            })}
            <Paginador pagina={paginaConductores} total={totalPaginasConductores} cantidad={visibles.length} porPagina={CONDUCTORES_POR_PAGINA} alCambiar={(p) => { setPaginaConductores(p); setAbierto(null); setSeleccionado(null) }} etiqueta="conductores" />
          </div>
          <div className="lg:sticky lg:top-4 lg:col-span-7 lg:h-[calc(100vh-200px)] lg:min-h-[420px]">
            <MapaUbicacionRc cuadrantes={cuadrantes} recibos={puntos} seleccionado={seleccionadoVisible} onSeleccionar={setSeleccionado} />
            {puntos.length === 0 && <p className="mt-2 text-center text-xs text-muted-foreground">No hay puntos GPS para mostrar con estos filtros.</p>}
          </div>
        </div>
        <p className="text-xs text-muted-foreground"><strong>Precisión:</strong> margen estimado del GPS en metros. <strong>Aproximada:</strong> el celular usó su última ubicación conocida o reportó una ubicación simulada.</p>
      </>
    </CuerpoConsulta>
  </section>
}
