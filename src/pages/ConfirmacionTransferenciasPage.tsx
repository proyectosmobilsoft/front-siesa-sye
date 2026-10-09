import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { RefreshCw, Plus } from 'lucide-react'
import { transferenciasConfirmacionApi, type ConfirmacionTransferencia, type EstadoTransferencia } from '@/api/transferenciasConfirmacion'
import { usePermiso } from '@/hooks/usePermiso'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FechaInput } from '@/components/ui/fecha-input'
import { formatters } from '@/utils/formatters'
import { NuevaConfirmacionModal } from '@/components/transferencias/NuevaConfirmacionModal'
import { DetalleConfirmacionModal } from '@/components/transferencias/DetalleConfirmacionModal'

const tabs: { label: string; estado: EstadoTransferencia | 'TODAS' }[] = [
  { label: 'Pendientes', estado: 'PENDIENTE' }, { label: 'Aprobadas', estado: 'APROBADA' },
  { label: 'Usadas en RC', estado: 'USADA' }, { label: 'Rechazadas', estado: 'RECHAZADA' }, { label: 'Todas', estado: 'TODAS' },
]
const colores: Record<EstadoTransferencia, string> = {
  PENDIENTE: 'bg-amber-500/10 text-amber-700 dark:text-amber-400', APROBADA: 'bg-green-500/10 text-green-700 dark:text-green-400',
  USADA: 'bg-blue-500/10 text-blue-700 dark:text-blue-400', EN_USO: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
  RECHAZADA: 'bg-red-500/10 text-red-700 dark:text-red-400', ANULADA: 'bg-muted text-muted-foreground',
}
const etiquetas: Record<EstadoTransferencia, string> = { PENDIENTE: 'Pendiente', APROBADA: 'Aprobada', USADA: 'Usada', EN_USO: 'En uso', RECHAZADA: 'Rechazada', ANULADA: 'Anulada' }
function Estado({ row }: { row: ConfirmacionTransferencia }) { return <span className={`inline-block rounded-full px-2 py-1 text-xs font-semibold ${colores[row.estado]}`}>{etiquetas[row.estado]}{row.estado === 'USADA' && row.rc_numero ? ` · RC ${row.rc_numero}` : ''}</span> }
const fechaHora = (usuario: string | null, fecha: string | null) => usuario ? <span>{usuario}<span className="block text-xs text-muted-foreground">{formatters.dateTime(fecha)}</span></span> : <span className="text-muted-foreground">—</span>
export function ConfirmacionTransferenciasPage() {
  const { puede, P } = usePermiso()
  const queryClient = useQueryClient()
  const [estado, setEstado] = useState<EstadoTransferencia | 'TODAS'>(() => puede(P.APROBAR_TRANSFERENCIA) ? 'PENDIENTE' : 'TODAS')
  const [search, setSearch] = useState('')
  const [searchDebounced, setSearchDebounced] = useState('')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [page, setPage] = useState(1)
  const [nuevo, setNuevo] = useState(false)
  const [detalleId, setDetalleId] = useState<number | null>(null)
  const [toast, setToast] = useState('')
  useEffect(() => { const timer = setTimeout(() => setSearchDebounced(search.trim()), 300); return () => clearTimeout(timer) }, [search])
  useEffect(() => { setPage(1) }, [estado, desde, hasta, searchDebounced])
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(''), 4000); return () => clearTimeout(timer) }, [toast])
  const lista = useQuery({ queryKey: ['transferencias-confirmacion', 'lista', estado, desde, hasta, searchDebounced, page], queryFn: () => transferenciasConfirmacionApi.listar({ estado, desde: desde || undefined, hasta: hasta || undefined, search: searchDebounced || undefined, page, pageSize: 20 }) })
  const resumen = useQuery({ queryKey: ['transferencias-confirmacion', 'resumen'], queryFn: transferenciasConfirmacionApi.resumen })
  const refresh = () => void queryClient.invalidateQueries({ queryKey: ['transferencias-confirmacion'] })
  const saved = (message: string) => { setNuevo(false); setDetalleId(null); setToast(message); refresh() }
  return <div className="space-y-4 p-4 sm:p-6">
    {toast && <div role="status" className="fixed right-6 top-20 z-50 rounded-lg border border-green-500/30 bg-card px-4 py-3 text-sm text-green-700 shadow-lg dark:text-green-400">{toast}</div>}
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-xl font-bold">Confirmación de transferencias</h1><p className="text-sm text-muted-foreground">Solicitudes y soportes de transferencias de clientes</p></div><Button onClick={() => setNuevo(true)}><Plus className="mr-2 h-4 w-4" />Nueva confirmación</Button></div>
    <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-3">
      <label className="min-w-52 flex-1 space-y-1 text-xs font-medium text-muted-foreground">Buscar cliente, NIT o referencia<Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar…" /></label>
      <label className="space-y-1 text-xs font-medium text-muted-foreground">Desde<FechaInput value={desde} onChange={setDesde} /></label>
      <label className="space-y-1 text-xs font-medium text-muted-foreground">Hasta<FechaInput value={hasta} onChange={setHasta} min={desde || undefined} /></label>
      <Button variant="outline" size="icon" title="Actualizar" aria-label="Actualizar" onClick={refresh}><RefreshCw className={`h-4 w-4 ${lista.isFetching ? 'animate-spin' : ''}`} /></Button>
    </div>
    <div role="tablist" aria-label="Estado" className="flex gap-1 overflow-x-auto border-b border-border">{tabs.map(tab => <button key={tab.estado} role="tab" aria-selected={estado === tab.estado} onClick={() => setEstado(tab.estado)} className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm ${estado === tab.estado ? 'border-primary font-semibold text-primary' : 'border-transparent text-muted-foreground'}`}>{tab.label} <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-xs tabular-nums">{tab.estado === 'TODAS' ? Object.values(resumen.data ?? {}).reduce((sum, n) => sum + Number(n ?? 0), 0) : resumen.data?.[tab.estado] ?? 0}</span></button>)}</div>
    {lista.isError && <p role="alert" className="rounded-lg border border-destructive/30 p-3 text-sm text-destructive">No se pudieron cargar las confirmaciones. <button className="underline" onClick={() => void lista.refetch()}>Reintentar</button></p>}
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="hidden overflow-x-auto md:block"><table className="w-full min-w-[1050px] text-left text-sm"><thead className="bg-muted/50 text-xs text-muted-foreground"><tr>{['Fecha transf.', 'Cliente', 'Facturas', 'Cuenta', 'Referencia', 'Valor', 'Estado', 'Solicitó', 'Revisó'].map((h, i) => <th key={h} className={`px-3 py-3 font-semibold ${i === 5 ? 'text-right' : ''}`}>{h}</th>)}</tr></thead><tbody>{lista.data?.data.map(row => <tr key={row.id} tabIndex={0} role="button" onClick={() => setDetalleId(row.id)} onKeyDown={e => { if (e.key === 'Enter') setDetalleId(row.id) }} className="cursor-pointer border-t border-border hover:bg-muted/40"><td className="whitespace-nowrap px-3 py-3">{formatters.dateOnly(row.fecha_transferencia)}</td><td className="px-3 py-3 font-medium">{row.razon_social}<span className="block text-xs font-normal text-muted-foreground">NIT {row.nit}</span></td><td className="px-3 py-3">{row.cant_facturas}</td><td className="px-3 py-3">{row.id_cta_bancaria}</td><td className="px-3 py-3">{row.referencia || '—'}</td><td className="px-3 py-3 text-right font-semibold tabular-nums">{formatters.currency(Number(row.valor) || 0)}</td><td className="px-3 py-3"><Estado row={row} /></td><td className="px-3 py-3">{fechaHora(row.created_by_usuario, row.created_at)}</td><td className="px-3 py-3">{fechaHora(row.revisado_by_usuario, row.revisado_at)}</td></tr>)}</tbody></table></div>
      <div className="divide-y divide-border md:hidden">{lista.data?.data.map(row => <button key={row.id} onClick={() => setDetalleId(row.id)} className="w-full space-y-2 p-4 text-left hover:bg-muted/40"><div className="flex justify-between gap-3"><span className="font-semibold">{row.razon_social}</span><span className="whitespace-nowrap font-bold tabular-nums">{formatters.currency(Number(row.valor) || 0)}</span></div><p className="text-xs text-muted-foreground">NIT {row.nit} · {formatters.dateOnly(row.fecha_transferencia)} · Cuenta {row.id_cta_bancaria}</p><p className="text-xs text-muted-foreground">Referencia: {row.referencia || '—'} · {row.cant_facturas} factura(s) · {row.cant_soportes} soporte(s)</p><div className="flex items-center justify-between gap-2"><Estado row={row} /></div><div className="grid gap-1 text-xs text-muted-foreground"><span>Solicitó: {row.created_by_usuario} · {formatters.dateTime(row.created_at)}</span><span>Revisó: {row.revisado_by_usuario ? `${row.revisado_by_usuario} · ${formatters.dateTime(row.revisado_at)}` : '—'}</span></div></button>)}</div>
      {lista.isLoading && <p className="p-6 text-center text-sm text-muted-foreground">Cargando confirmaciones…</p>}
      {!lista.isLoading && !lista.data?.data.length && <p className="p-6 text-center text-sm text-muted-foreground">No hay confirmaciones para estos filtros.</p>}
      {(lista.data?.pagination.totalPages ?? 0) > 1 && <div className="flex items-center justify-between border-t border-border p-3 text-sm"><span>Página {page} de {lista.data?.pagination.totalPages} · {lista.data?.pagination.total} registros</span><div className="flex gap-2"><Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Anterior</Button><Button size="sm" variant="outline" disabled={page >= (lista.data?.pagination.totalPages ?? 1)} onClick={() => setPage(p => p + 1)}>Siguiente</Button></div></div>}
    </div>
    {nuevo && <NuevaConfirmacionModal onClose={() => setNuevo(false)} onSaved={saved} />}
    {detalleId != null && <DetalleConfirmacionModal id={detalleId} onClose={() => setDetalleId(null)} onSaved={saved} />}
  </div>
}
