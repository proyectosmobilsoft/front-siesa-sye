import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Download, Search, ShieldAlert } from 'lucide-react'
import { rcAnomaliasApi, type CodigoAnomalia, type RcAnomalo } from '@/api/rcAnomalias'
import { RcAnomaloModal } from '@/components/rcAnomalos/RcAnomaloModal'
import { moneda, severidadColor, severidadOrden } from '@/components/rcAnomalos/presentation'
import { Button } from '@/components/ui/button'
import { FechaInput } from '@/components/ui/fecha-input'
import { Input } from '@/components/ui/input'
import { useAuthStore } from '@/store/authStore'
import { formatters } from '@/utils/formatters'

const localIso = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
const hoy = () => localIso(new Date())
type Filtros = { desde: string; hasta: string; co: '001' | '002' | 'AMBOS'; consulta: number }
const csvCampo = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`
const nombreRc = (rc: RcAnomalo) => `${rc.co}-${rc.tipo}-${rc.numero}`
function descargarCsv(rows: RcAnomalo[]) {
  const cabecera = ['RC', 'Fecha', 'Cliente', 'NIT', 'Creado por', 'Origen', 'Estado', 'Débitos', 'Créditos', 'Anomalías']
  const lineas = rows.map(rc => [nombreRc(rc), formatters.dateOnly(rc.fecha), rc.cliente, rc.nit, rc.usuario_creacion, rc.origen, rc.estado, Number(rc.total_db) || 0, Number(rc.total_cr) || 0, rc.anomalias.map(a => a.codigo).join('; ')])
  const csv = '\uFEFF' + [cabecera, ...lineas].map(row => row.map(csvCampo).join(',')).join('\r\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const enlace = document.createElement('a')
  enlace.href = url; enlace.download = `rc-anomalos-${hoy()}.csv`; enlace.click()
  URL.revokeObjectURL(url)
}

export function RcAnomalosPage() {
  const centroOperacionActivo = useAuthStore(s => s.centroOperacionActivo)
  const co = centroOperacionActivo === '001' || centroOperacionActivo === '002' ? centroOperacionActivo : 'AMBOS'
  const [desde, setDesde] = useState(() => localIso(new Date(new Date().getFullYear(), new Date().getMonth(), 1)))
  const [hasta, setHasta] = useState(hoy)
  const [filtros, setFiltros] = useState<Filtros | null>(null)
  const [errorFecha, setErrorFecha] = useState('')
  const [codigo, setCodigo] = useState<CodigoAnomalia | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [tab, setTab] = useState<'rcs' | 'procesos'>('rcs')
  const [seleccionado, setSeleccionado] = useState<RcAnomalo | null>(null)
  const consulta = useQuery({
    queryKey: ['rc-anomalias', 'consulta', filtros],
    queryFn: () => rcAnomaliasApi.consultar({ desde: filtros!.desde, hasta: filtros!.hasta, co: filtros!.co }),
    enabled: filtros !== null && filtros.co === co,
    retry: 0,
    staleTime: Infinity,
  })
  const datos = filtros?.co === co ? consulta.data : undefined
  const filas = useMemo(() => (datos?.rcs ?? []).filter(rc => {
    if (codigo && !rc.anomalias.some(a => a.codigo === codigo)) return false
    const q = busqueda.trim().toLocaleLowerCase('es')
    return !q || [rc.numero, rc.cliente, rc.nit].some(v => String(v ?? '').toLocaleLowerCase('es').includes(q))
  }).sort((a, b) => {
    const sa = Math.min(...a.anomalias.map(x => severidadOrden[x.severidad]))
    const sb = Math.min(...b.anomalias.map(x => severidadOrden[x.severidad]))
    return sa - sb || b.fecha.localeCompare(a.fecha) || b.rowid - a.rowid
  }), [datos, codigo, busqueda])
  const consultar = () => {
    if (!desde || !hasta || desde > hasta) { setErrorFecha('Elige un rango de fechas válido.'); return }
    const dias = Math.round((Date.parse(`${hasta}T12:00:00Z`) - Date.parse(`${desde}T12:00:00Z`)) / 86400000) + 1
    if (dias > 93) { setErrorFecha('El rango máximo es de 93 días.'); return }
    setErrorFecha(''); setCodigo(null); setTab('rcs')
    setFiltros(prev => ({ desde, hasta, co, consulta: (prev?.consulta ?? 0) + 1 }))
  }
  const totalProblemas = (datos?.rcs.length ?? 0) + (datos?.procesos.length ?? 0)
  return <div className="flex min-h-full flex-col gap-3 p-4 text-sm lg:h-full lg:min-h-0 lg:p-5">
    <div className="flex flex-wrap items-center justify-between gap-2"><div><h1 className="flex items-center gap-2 text-xl font-bold"><ShieldAlert className="h-5 w-5 text-primary" />RC Anómalos</h1><p className="text-xs text-muted-foreground">Recibos con problemas contables o de proceso · C.O. {co}</p></div><span role="status" className="text-xs font-medium text-muted-foreground">{consulta.isFetching && filtros?.co === co ? `Revisando ${formatters.number(datos?.total_rc_revisados ?? 0)} RC…` : datos ? `Revisados ${formatters.number(datos.total_rc_revisados)} RC · ${formatters.number(datos.rcs.length)} con anomalías` : 'Selecciona el rango y consulta'}</span></div>
    <div className="flex flex-wrap items-end gap-2 rounded-xl border border-border bg-card p-3"><label className="w-36 space-y-1 text-xs font-medium text-muted-foreground">Desde<FechaInput value={desde} onChange={setDesde} max={hasta || undefined} /></label><label className="w-36 space-y-1 text-xs font-medium text-muted-foreground">Hasta<FechaInput value={hasta} onChange={setHasta} min={desde || undefined} /></label><Button onClick={consultar} disabled={consulta.isFetching && filtros?.co === co}>{consulta.isFetching && filtros?.co === co ? 'Revisando…' : 'Consultar'}</Button>{errorFecha && <span role="alert" className="text-xs text-destructive">{errorFecha}</span>}</div>
    {consulta.isError && filtros?.co === co && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-destructive">No se pudo consultar el rango. <button className="underline" onClick={() => void consulta.refetch()}>Reintentar</button></p>}
    {datos && <>
      <div className="flex gap-2 overflow-x-auto pb-1">{datos.resumen.map(item => <button key={item.codigo} onClick={() => { setCodigo(c => c === item.codigo ? null : item.codigo); setTab('rcs') }} aria-pressed={codigo === item.codigo} className={`min-w-40 shrink-0 rounded-lg border p-2.5 text-left transition hover:ring-1 hover:ring-current ${severidadColor[item.severidad]} ${codigo === item.codigo ? 'ring-2 ring-current' : ''}`}><span className="block truncate text-xs font-semibold" title={item.titulo}>{item.titulo}</span><span className="mt-1 block text-lg font-bold tabular-nums">{formatters.number(item.cantidad)}</span>{Number(item.diferencia_total) > 0 && <span className="block text-xs tabular-nums">{moneda(item.diferencia_total)}</span>}</button>)}<button onClick={() => setTab('procesos')} className="min-w-36 shrink-0 rounded-lg border border-border bg-card p-2.5 text-left hover:bg-muted/40"><span className="text-xs font-semibold">Procesos</span><span className="mt-1 block text-lg font-bold tabular-nums">{formatters.number(datos.procesos.length)}</span></button></div>
      {totalProblemas === 0 && <p role="status" className="rounded-lg border border-green-500/30 bg-green-500/10 p-4 text-center font-semibold text-green-700 dark:text-green-300">Sin anomalías en el rango</p>}
      <div className="flex items-center justify-between gap-2 border-b border-border"><div role="tablist" aria-label="Resultados" className="flex gap-1">{([['rcs', `Recibos (${datos.rcs.length})`], ['procesos', `Procesos (${datos.procesos.length})`]] as const).map(([id, label]) => <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={`border-b-2 px-3 py-2 text-xs font-semibold ${tab === id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}>{label}</button>)}</div>{tab === 'rcs' && <Button size="sm" variant="outline" onClick={() => descargarCsv(filas)} disabled={!filas.length}><Download className="mr-1.5 h-4 w-4" />Exportar CSV</Button>}</div>
      {tab === 'rcs' ? <><div className="flex max-w-xs items-center gap-2"><Search className="h-4 w-4 text-muted-foreground" /><Input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Número, cliente o NIT" className="h-8" /></div><div className="min-h-0 flex-1 overflow-auto rounded-xl border border-border bg-card custom-scrollbar"><table className="hidden w-full min-w-[1020px] text-left text-xs md:table"><thead className="sticky top-0 z-10 bg-muted text-muted-foreground"><tr>{['RC', 'Fecha', 'Cliente', 'Creado por', 'Estado', 'Débitos', 'Créditos', 'Anomalías'].map((h, i) => <th key={h} className={`px-3 py-2 font-semibold ${i === 5 || i === 6 ? 'text-right' : ''}`}>{h}</th>)}</tr></thead><tbody>{filas.map(rc => <tr key={rc.rowid} tabIndex={0} role="button" onClick={() => setSeleccionado(rc)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSeleccionado(rc) } }} className="cursor-pointer border-t border-border hover:bg-muted/40"><td className="whitespace-nowrap px-3 py-2 font-semibold">{nombreRc(rc)}</td><td className="whitespace-nowrap px-3 py-2">{formatters.dateOnly(rc.fecha)}</td><td className="max-w-52 px-3 py-2"><span className="block truncate" title={rc.cliente ?? ''}>{rc.cliente || '—'}</span><small className="text-muted-foreground">NIT {rc.nit || '—'}</small></td><td className="px-3 py-2">{rc.usuario_creacion || '—'}<span className="ml-1 rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">{rc.origen === 'API' ? 'App/Web' : 'SIESA'}</span></td><td className="px-3 py-2">{rc.estado}</td><td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{moneda(rc.total_db)}</td><td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{moneda(rc.total_cr)}</td><td className="px-3 py-2"><div className="flex flex-wrap gap-1">{rc.anomalias.map((a, i) => <span key={`${a.codigo}-${i}`} title={a.mensaje} className={`rounded border px-1.5 py-0.5 text-[10px] font-medium ${severidadColor[a.severidad]}`}>{a.codigo.replace(/_/g, ' ')}</span>)}</div></td></tr>)}</tbody></table><div className="divide-y divide-border md:hidden">{filas.map(rc => <button key={rc.rowid} onClick={() => setSeleccionado(rc)} className="w-full space-y-1.5 p-3 text-left hover:bg-muted/40"><div className="flex justify-between gap-2"><strong>{nombreRc(rc)}</strong><span className="text-xs text-muted-foreground">{formatters.dateOnly(rc.fecha)}</span></div><p>{rc.cliente || '—'} <span className="text-xs text-muted-foreground">· NIT {rc.nit || '—'}</span></p><p className="text-xs text-muted-foreground">{rc.usuario_creacion || '—'} · {rc.origen === 'API' ? 'App/Web' : 'SIESA'} · {rc.estado}</p><div className="flex justify-between text-xs tabular-nums"><span>Déb. {moneda(rc.total_db)}</span><span>Créd. {moneda(rc.total_cr)}</span></div><div className="flex flex-wrap gap-1">{rc.anomalias.map((a, i) => <span key={`${a.codigo}-${i}`} title={a.mensaje} className={`rounded border px-1.5 py-0.5 text-[10px] ${severidadColor[a.severidad]}`}>{a.codigo.replace(/_/g, ' ')}</span>)}</div></button>)}</div>{filas.length === 0 && <p className="p-6 text-center text-muted-foreground">No hay recibos para estos filtros.</p>}</div><p className="text-xs text-muted-foreground">{filas.length} de {datos.rcs.length} recibos</p></> : <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-border bg-card"><table className="w-full min-w-[650px] text-left text-xs"><thead className="sticky top-0 bg-muted text-muted-foreground"><tr>{['Usuario', 'Estado', 'Error', 'Creado', 'RC'].map(h => <th key={h} className="px-3 py-2">{h}</th>)}</tr></thead><tbody>{datos.procesos.map(p => <tr key={p.idempotency_key} className="border-t border-border"><td className="px-3 py-2">{p.usuario_nombre || '—'}<small className="block max-w-48 truncate text-muted-foreground" title={p.idempotency_key}>{p.idempotency_key}</small></td><td className="px-3 py-2"><span className={`rounded px-2 py-1 font-semibold ${p.estado === 'FAILED' ? 'bg-red-500/10 text-red-700 dark:text-red-300' : 'bg-amber-500/10 text-amber-800 dark:text-amber-300'}`}>{p.estado === 'FAILED' ? 'Fallido' : 'En proceso'}</span></td><td className="max-w-sm break-words px-3 py-2">{p.error_message || '—'}</td><td className="whitespace-nowrap px-3 py-2">{formatters.dateTime(p.created_at)}</td><td className="px-3 py-2">{p.numero_recibo || '—'}</td></tr>)}</tbody></table>{datos.procesos.length === 0 && <p className="p-6 text-center text-muted-foreground">Sin procesos fallidos o atascados.</p>}</div>}
    </>}
    {seleccionado && <RcAnomaloModal rc={seleccionado} onClose={() => setSeleccionado(null)} />}
  </div>
}
