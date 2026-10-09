import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Download, Search, ShieldAlert, SlidersHorizontal } from 'lucide-react'
import { rcAnomaliasApi, type CodigoAnomalia, type RcAnomalo, type SeveridadAnomalia } from '@/api/rcAnomalias'
import { RcAnomaloModal } from '@/components/rcAnomalos/RcAnomaloModal'
import { canalRc, diferenciaAnomalia, etiquetaCanal, etiquetaEstado } from '@/components/rcAnomalos/filters'
import { moneda, severidadColor, severidadOrden } from '@/components/rcAnomalos/presentation'
import { Button } from '@/components/ui/button'
import { FechaInput } from '@/components/ui/fecha-input'
import { Input } from '@/components/ui/input'
import { useAuthStore } from '@/store/authStore'
import { formatters } from '@/utils/formatters'

const localIso = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
const hoy = () => localIso(new Date())
type Co = '001' | '002' | 'AMBOS'
type Consulta = { desde: string; hasta: string; co: Co; consulta: number }
type Canal = 'TODOS' | 'APP' | 'WEB' | 'SIESA'
type Estado = 'TODOS' | '1' | '2'
const csvCampo = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`
const nombreRc = (rc: RcAnomalo) => `${rc.co}-${rc.tipo}-${rc.numero}`
const selectClase = 'h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring'
const tituloFiltro = 'flex flex-col gap-1 text-xs font-medium text-muted-foreground'

function descargarCsv(rows: RcAnomalo[]) {
  const cabecera = ['RC', 'Fecha', 'Cliente', 'NIT', 'Creado por', 'Canal', 'Estado', 'Débitos', 'Créditos', 'Anomalías']
  const lineas = rows.map(rc => [nombreRc(rc), formatters.dateOnly(rc.fecha), rc.cliente, rc.nit, rc.usuario_creacion, etiquetaCanal(rc), etiquetaEstado(rc.estado), Number(rc.total_db) || 0, Number(rc.total_cr) || 0, rc.anomalias.map(a => a.codigo).join('; ')])
  const csv = '\uFEFF' + [cabecera, ...lineas].map(row => row.map(csvCampo).join(',')).join('\r\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = `rc-anomalos-${hoy()}.csv`
  enlace.click()
  URL.revokeObjectURL(url)
}

export function RcAnomalosPage() {
  const centroOperacionActivo = useAuthStore(s => s.centroOperacionActivo)
  const coActivo: Co = centroOperacionActivo === '001' || centroOperacionActivo === '002' ? centroOperacionActivo : 'AMBOS'
  const [co, setCo] = useState<Co>(coActivo)
  useEffect(() => setCo(coActivo), [coActivo])
  const [desde, setDesde] = useState(() => localIso(new Date(new Date().getFullYear(), new Date().getMonth(), 1)))
  const [hasta, setHasta] = useState(hoy)
  const [consultaActual, setConsultaActual] = useState<Consulta | null>(null)
  const [errorFecha, setErrorFecha] = useState('')
  const [canal, setCanal] = useState<Canal>('TODOS')
  const [severidad, setSeveridad] = useState<SeveridadAnomalia | 'todas'>('todas')
  const [codigos, setCodigos] = useState<CodigoAnomalia[]>([])
  const [estado, setEstado] = useState<Estado>('TODOS')
  const [creadoPor, setCreadoPor] = useState('')
  const [diferenciaMinima, setDiferenciaMinima] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false)
  const [tab, setTab] = useState<'rcs' | 'procesos'>('rcs')
  const [seleccionado, setSeleccionado] = useState<RcAnomalo | null>(null)
  const consulta = useQuery({
    queryKey: ['rc-anomalias', 'consulta', consultaActual],
    queryFn: () => rcAnomaliasApi.consultar({ desde: consultaActual!.desde, hasta: consultaActual!.hasta, co: consultaActual!.co }),
    enabled: consultaActual !== null,
    retry: 0,
    staleTime: Infinity,
  })
  const datos = consultaActual ? consulta.data : undefined
  const usuarios = useMemo(() => [...new Set((datos?.rcs ?? []).map(rc => rc.usuario_creacion).filter((v): v is string => !!v))].sort((a, b) => a.localeCompare(b, 'es')), [datos])
  const minimo = diferenciaMinima === '' ? 0 : Math.max(0, Number(diferenciaMinima) || 0)
  const busquedaNormalizada = busqueda.trim().toLocaleLowerCase('es')
  const filasSinTipo = useMemo(() => (datos?.rcs ?? []).filter(rc => {
    if (canal !== 'TODOS' && canalRc(rc) !== canal) return false
    if (severidad !== 'todas' && !rc.anomalias.some(a => a.severidad === severidad)) return false
    if (estado !== 'TODOS' && String(rc.estado).trim() !== estado) return false
    if (creadoPor && rc.usuario_creacion !== creadoPor) return false
    if (minimo > 0 && !rc.anomalias.some(a => (diferenciaAnomalia(a) ?? -1) >= minimo)) return false
    return !busquedaNormalizada || [rc.numero, rc.cliente, rc.nit].some(v => String(v ?? '').toLocaleLowerCase('es').includes(busquedaNormalizada))
  }), [datos, canal, severidad, estado, creadoPor, minimo, busquedaNormalizada])
  const filas = useMemo(() => filasSinTipo.filter(rc => !codigos.length || rc.anomalias.some(a => codigos.includes(a.codigo))).sort((a, b) => {
    const sa = Math.min(...a.anomalias.map(x => severidadOrden[x.severidad]))
    const sb = Math.min(...b.anomalias.map(x => severidadOrden[x.severidad]))
    return sa - sb || b.fecha.localeCompare(a.fecha) || b.rowid - a.rowid
  }), [filasSinTipo, codigos])
  const resumen = useMemo(() => (datos?.resumen ?? []).map(item => {
    const rcs = filasSinTipo.filter(rc => rc.anomalias.some(a => a.codigo === item.codigo))
    return { ...item, cantidad: rcs.length, diferencia_total: rcs.reduce((total, rc) => total + rc.anomalias.filter(a => a.codigo === item.codigo).reduce((sum, a) => sum + (diferenciaAnomalia(a) ?? 0), 0), 0) }
  }), [datos, filasSinTipo])
  const filtrosActivos = canal !== 'TODOS' || severidad !== 'todas' || codigos.length > 0 || estado !== 'TODOS' || !!creadoPor || minimo > 0 || !!busqueda.trim()
  const limpiarFiltros = () => {
    setCanal('TODOS'); setSeveridad('todas'); setCodigos([]); setEstado('TODOS')
    setCreadoPor(''); setDiferenciaMinima(''); setBusqueda('')
  }
  const alternarCodigo = (codigo: CodigoAnomalia) => {
    setCodigos(actual => actual.includes(codigo) ? actual.filter(c => c !== codigo) : [...actual, codigo])
    setTab('rcs')
  }
  const consultar = () => {
    if (!desde || !hasta || desde > hasta) { setErrorFecha('Elige un rango de fechas válido.'); return }
    const dias = Math.round((Date.parse(`${hasta}T12:00:00Z`) - Date.parse(`${desde}T12:00:00Z`)) / 86400000) + 1
    if (dias > 366) { setErrorFecha('El rango máximo es de 12 meses.'); return }
    setErrorFecha(''); setTab('rcs')
    setConsultaActual(prev => ({ desde, hasta, co, consulta: (prev?.consulta ?? 0) + 1 }))
  }
  const totalProblemas = (datos?.rcs.length ?? 0) + (datos?.procesos.length ?? 0)
  return <div className="flex min-h-full flex-col gap-3 p-4 text-sm lg:h-full lg:min-h-0 lg:p-5">
    <div className="flex flex-wrap items-center justify-between gap-2"><div><h1 className="flex items-center gap-2 text-xl font-bold"><ShieldAlert className="h-5 w-5 text-primary" />RC Anómalos</h1><p className="text-xs text-muted-foreground">Recibos con problemas contables o de proceso · C.O. {consultaActual?.co ?? co}</p></div><span role="status" className="text-xs font-medium text-muted-foreground">{consulta.isFetching ? `Revisando ${formatters.number(datos?.total_rc_revisados ?? 0)} RC…` : datos ? `Revisados ${formatters.number(datos.total_rc_revisados)} RC · ${formatters.number(datos.rcs.length)} con anomalías` : 'Selecciona el rango y consulta'}</span></div>
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="flex flex-wrap items-end gap-2">
        <label className={`${tituloFiltro} w-36`}>Desde<FechaInput value={desde} onChange={setDesde} max={hasta || undefined} className="!h-9" /></label>
        <label className={`${tituloFiltro} w-36`}>Hasta<FechaInput value={hasta} onChange={setHasta} min={desde || undefined} className="!h-9" /></label>
        <label className={tituloFiltro}>C.O.<select value={co} onChange={e => setCo(e.target.value as Co)} className={selectClase}><option value="AMBOS">Ambos</option><option value="001">001</option><option value="002">002</option></select></label>
        <Button className="h-9" onClick={consultar} disabled={consulta.isFetching}>{consulta.isFetching ? 'Revisando…' : 'Consultar'}</Button>
        <Button type="button" variant="outline" className="h-9 md:hidden" aria-expanded={filtrosAbiertos} aria-controls="filtros-rc" onClick={() => setFiltrosAbiertos(v => !v)}><SlidersHorizontal className="mr-1.5 h-4 w-4" />Filtros{filtrosActivos ? ' · activos' : ''}</Button>
        <div id="filtros-rc" className={`${filtrosAbiertos ? 'flex' : 'hidden'} w-full flex-wrap items-end gap-2 md:flex md:w-auto md:flex-1`}>
          <label className={tituloFiltro}>Canal<select value={canal} onChange={e => setCanal(e.target.value as Canal)} className={selectClase}><option value="TODOS">Todos</option><option value="APP">App</option><option value="WEB">Web</option><option value="SIESA">SIESA</option></select></label>
          <label className={tituloFiltro}>Severidad<select value={severidad} onChange={e => setSeveridad(e.target.value as SeveridadAnomalia | 'todas')} className={selectClase}><option value="todas">Todas</option><option value="critica">Crítica</option><option value="alta">Alta</option><option value="media">Media</option></select></label>
          <div className={tituloFiltro}><span>Tipo de anomalía</span><details className="relative"><summary className={`${selectClase} flex min-w-36 cursor-pointer list-none items-center justify-between gap-2`}> {codigos.length ? `${codigos.length} seleccionados` : 'Todos'} <span aria-hidden>▾</span></summary><div className="absolute left-0 top-full z-30 mt-1 max-h-72 min-w-64 overflow-auto rounded-md border border-border bg-popover p-2 text-popover-foreground shadow-lg">{resumen.map(item => { const vacio = item.cantidad === 0 && !codigos.includes(item.codigo); return <label key={item.codigo} className={`flex items-center gap-2 rounded px-2 py-1.5 text-sm ${vacio ? 'cursor-not-allowed opacity-40' : 'cursor-pointer hover:bg-muted'}`}><input type="checkbox" disabled={vacio} checked={codigos.includes(item.codigo)} onChange={() => alternarCodigo(item.codigo)} className="accent-primary" /><span className="flex-1">{item.titulo}</span><span className="tabular-nums text-xs text-muted-foreground">{formatters.number(item.cantidad)}</span></label> })}{!datos && <span className="px-2 text-xs text-muted-foreground">Consulta un rango para ver los tipos.</span>}</div></details></div>
          <label className={tituloFiltro}>Estado<select value={estado} onChange={e => setEstado(e.target.value as Estado)} className={selectClase}><option value="TODOS">Todos</option><option value="1">Aprobado</option><option value="2">Anulado</option></select></label>
          <label className={tituloFiltro}>Creado por<select value={creadoPor} onChange={e => setCreadoPor(e.target.value)} className={`${selectClase} max-w-40`}><option value="">Todos</option>{usuarios.map(usuario => <option key={usuario} value={usuario}>{usuario}</option>)}</select></label>
          <label className={tituloFiltro}>Diferencia mínima ($)<Input type="number" min="0" step="any" inputMode="decimal" value={diferenciaMinima} onChange={e => setDiferenciaMinima(e.target.value)} placeholder="0" className="h-9 w-32 text-sm tabular-nums" /></label>
          <label className={`${tituloFiltro} min-w-40 flex-1`}>Buscar<div className="relative"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Número, cliente o NIT" className="h-9 pl-8 text-sm" /></div></label>
          {filtrosActivos && <Button type="button" size="sm" variant="ghost" className="h-9" onClick={limpiarFiltros}>Limpiar filtros</Button>}
        </div>
        {errorFecha && <span role="alert" className="w-full text-xs text-destructive">{errorFecha}</span>}
      </div>
    </div>
    {consulta.isError && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-destructive">No se pudo consultar el rango. <button className="underline" onClick={() => void consulta.refetch()}>Reintentar</button></p>}
    {datos && <>
      <div className="flex gap-2 overflow-x-auto pb-1">{resumen.map(item => <button key={item.codigo} onClick={() => alternarCodigo(item.codigo)} aria-pressed={codigos.includes(item.codigo)} className={`min-w-40 shrink-0 rounded-lg border p-2.5 text-left transition hover:ring-1 hover:ring-current ${severidadColor[item.severidad]} ${codigos.includes(item.codigo) ? 'ring-2 ring-current' : ''}`}><span className="block truncate text-xs font-semibold" title={item.titulo}>{item.titulo}</span><span className="mt-1 block text-lg font-bold tabular-nums">{formatters.number(item.cantidad)}</span>{item.diferencia_total > 0 && <span className="block text-xs tabular-nums">{moneda(item.diferencia_total)}</span>}</button>)}<button onClick={() => setTab('procesos')} className="min-w-36 shrink-0 rounded-lg border border-border bg-card p-2.5 text-left hover:bg-muted/40"><span className="text-xs font-semibold">Procesos</span><span className="mt-1 block text-lg font-bold tabular-nums">{formatters.number(datos.procesos.length)}</span></button></div>
      {totalProblemas === 0 && <p role="status" className="rounded-lg border border-green-500/30 bg-green-500/10 p-4 text-center font-semibold text-green-700 dark:text-green-300">Sin anomalías en el rango</p>}
      <div className="flex items-center justify-between gap-2 border-b border-border"><div role="tablist" aria-label="Resultados" className="flex gap-1">{([['rcs', `Recibos (${filas.length})`], ['procesos', `Procesos (${datos.procesos.length})`]] as const).map(([id, label]) => <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={`border-b-2 px-3 py-2 text-xs font-semibold ${tab === id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}>{label}</button>)}</div>{tab === 'rcs' && <Button size="sm" variant="outline" onClick={() => descargarCsv(filas)} disabled={!filas.length}><Download className="mr-1.5 h-4 w-4" />Exportar CSV</Button>}</div>
      {tab === 'rcs' ? <><div className="min-h-0 flex-1 overflow-auto rounded-xl border border-border bg-card custom-scrollbar"><table className="hidden w-full min-w-[1020px] text-left text-xs md:table"><thead className="sticky top-0 z-10 bg-muted text-muted-foreground"><tr>{['RC', 'Fecha', 'Cliente', 'Creado por', 'Estado', 'Débitos', 'Créditos', 'Anomalías'].map((h, i) => <th key={h} className={`px-3 py-2 font-semibold ${i === 5 || i === 6 ? 'text-right' : ''}`}>{h}</th>)}</tr></thead><tbody>{filas.map(rc => <tr key={rc.rowid} tabIndex={0} role="button" onClick={() => setSeleccionado(rc)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSeleccionado(rc) } }} className="cursor-pointer border-t border-border hover:bg-muted/40"><td className="whitespace-nowrap px-3 py-2 font-semibold">{nombreRc(rc)}</td><td className="whitespace-nowrap px-3 py-2">{formatters.dateOnly(rc.fecha)}</td><td className="max-w-52 px-3 py-2"><span className="block truncate" title={rc.cliente ?? ''}>{rc.cliente || '—'}</span><small className="text-muted-foreground">NIT {rc.nit || '—'}</small></td><td className="px-3 py-2">{rc.usuario_creacion || '—'}<span className="ml-1 rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">{etiquetaCanal(rc)}</span></td><td className="px-3 py-2">{etiquetaEstado(rc.estado)}</td><td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{moneda(rc.total_db)}</td><td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{moneda(rc.total_cr)}</td><td className="px-3 py-2"><div className="flex flex-wrap gap-1">{rc.anomalias.map((a, i) => <span key={`${a.codigo}-${i}`} title={a.mensaje} className={`rounded border px-1.5 py-0.5 text-[10px] font-medium ${severidadColor[a.severidad]}`}>{a.codigo.replace(/_/g, ' ')}</span>)}</div></td></tr>)}</tbody></table><div className="divide-y divide-border md:hidden">{filas.map(rc => <button key={rc.rowid} onClick={() => setSeleccionado(rc)} className="w-full space-y-1.5 p-3 text-left hover:bg-muted/40"><div className="flex justify-between gap-2"><strong>{nombreRc(rc)}</strong><span className="text-xs text-muted-foreground">{formatters.dateOnly(rc.fecha)}</span></div><p>{rc.cliente || '—'} <span className="text-xs text-muted-foreground">· NIT {rc.nit || '—'}</span></p><p className="text-xs text-muted-foreground">{rc.usuario_creacion || '—'} · <span className="rounded bg-muted px-1.5 py-0.5">{etiquetaCanal(rc)}</span> · {etiquetaEstado(rc.estado)}</p><div className="flex justify-between text-xs tabular-nums"><span>Déb. {moneda(rc.total_db)}</span><span>Créd. {moneda(rc.total_cr)}</span></div><div className="flex flex-wrap gap-1">{rc.anomalias.map((a, i) => <span key={`${a.codigo}-${i}`} title={a.mensaje} className={`rounded border px-1.5 py-0.5 text-[10px] ${severidadColor[a.severidad]}`}>{a.codigo.replace(/_/g, ' ')}</span>)}</div></button>)}</div>{filas.length === 0 && <div className="p-6 text-center text-muted-foreground"><p>No hay recibos para estos filtros.</p>{codigos.length > 0 && resumen.filter(r => codigos.includes(r.codigo) && r.cantidad === 0).length === codigos.length && <p className="mt-1 text-xs">Los tipos elegidos no tienen RC en este rango y C.O. ({resumen.filter(r => codigos.includes(r.codigo)).map(r => r.titulo).join(", ")}).</p>}{filtrosActivos && <Button type="button" size="sm" variant="outline" className="mt-3" onClick={limpiarFiltros}>Limpiar filtros</Button>}</div>}</div><p className="text-xs text-muted-foreground">Mostrando {formatters.number(filas.length)} de {formatters.number(datos.rcs.length)} RC</p></> : <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-border bg-card"><table className="w-full min-w-[650px] text-left text-xs"><thead className="sticky top-0 bg-muted text-muted-foreground"><tr>{['Usuario', 'Estado', 'Error', 'Creado', 'RC'].map(h => <th key={h} className="px-3 py-2">{h}</th>)}</tr></thead><tbody>{datos.procesos.map(p => <tr key={p.idempotency_key} className="border-t border-border"><td className="px-3 py-2">{p.usuario_nombre || '—'}<small className="block max-w-48 truncate text-muted-foreground" title={p.idempotency_key}>{p.idempotency_key}</small></td><td className="px-3 py-2"><span className={`rounded px-2 py-1 font-semibold ${p.estado === 'FAILED' ? 'bg-red-500/10 text-red-700 dark:text-red-300' : 'bg-amber-500/10 text-amber-800 dark:text-amber-300'}`}>{p.estado === 'FAILED' ? 'Fallido' : 'En proceso'}</span></td><td className="max-w-sm break-words px-3 py-2">{p.error_message || '—'}</td><td className="whitespace-nowrap px-3 py-2">{formatters.dateTime(p.created_at)}</td><td className="px-3 py-2">{p.numero_recibo || '—'}</td></tr>)}</tbody></table>{datos.procesos.length === 0 && <p className="p-6 text-center text-muted-foreground">Sin procesos fallidos o atascados.</p>}</div>}
    </>}
    {seleccionado && <RcAnomaloModal rc={seleccionado} onClose={() => setSeleccionado(null)} />}
  </div>
}
