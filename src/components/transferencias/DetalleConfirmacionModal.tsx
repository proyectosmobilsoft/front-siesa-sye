import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { transferenciasConfirmacionApi, soporteUrl } from '@/api/transferenciasConfirmacion'
import { usePermiso } from '@/hooks/usePermiso'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatters } from '@/utils/formatters'
import { validarSoportes } from './soportes'
import { FileText, Upload } from 'lucide-react'

const errorMensaje = (error: unknown) => (error as { response?: { data?: { message?: string } }; message?: string }).response?.data?.message || (error as Error).message || 'No se pudo completar la operación'
type Accion = 'aprobar' | 'rechazar' | 'anular' | null
export function DetalleConfirmacionModal({ id, onClose, onSaved }: { id: number; onClose: () => void; onSaved: (message: string) => void }) {
  const { puede, P, sesion } = usePermiso()
  const [accion, setAccion] = useState<Accion>(null)
  const [valor, setValor] = useState('')
  const [motivo, setMotivo] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const detalle = useQuery({ queryKey: ['transferencias-confirmacion', 'detalle', id], queryFn: () => transferenciasConfirmacionApi.detalle(id) })
  const row = detalle.data
  const puedeAprobar = puede(P.APROBAR_TRANSFERENCIA)
  const puedeAnular = row && (row.created_by_usuario === sesion?.usuario || puedeAprobar)
  const ejecutar = async () => {
    if (!row || !accion) return
    if (accion === 'aprobar' && !(Number(valor) > 0)) { setError('Ingresa un valor mayor que cero.'); return }
    if (accion === 'rechazar' && motivo.trim().length < 5) { setError('El motivo debe tener al menos 5 caracteres.'); return }
    setSaving(true); setError('')
    try {
      if (accion === 'aprobar') await transferenciasConfirmacionApi.aprobar(id, Number(valor))
      if (accion === 'rechazar') await transferenciasConfirmacionApi.rechazar(id, motivo.trim())
      if (accion === 'anular') await transferenciasConfirmacionApi.anular(id)
      onSaved({ aprobar: 'Transferencia aprobada', rechazar: 'Transferencia rechazada', anular: 'Transferencia anulada' }[accion])
    } catch (e) { setError(errorMensaje(e)) } finally { setSaving(false) }
  }
  const subir = async () => {
    const validation = validarSoportes(files, row?.soportes.length ?? 0)
    if (validation) { setError(validation); return }
    if (!files.length) { setError('Selecciona al menos un soporte.'); return }
    setSaving(true); setError('')
    try { await transferenciasConfirmacionApi.agregarSoportes(id, files); onSaved('Soportes agregados') }
    catch (e) { setError(errorMensaje(e)) } finally { setSaving(false) }
  }
  return <Modal isOpen onClose={() => { if (!saving) onClose() }} title={`Confirmación #${id}`} className="max-w-2xl">
    {detalle.isLoading && <p className="text-sm text-muted-foreground">Cargando detalle…</p>}
    {detalle.isError && <p role="alert" className="text-sm text-destructive">{errorMensaje(detalle.error)}</p>}
    {row && <div className="space-y-5 text-sm">
      <div className="grid gap-3 rounded-lg border border-border p-3 sm:grid-cols-2">
        <p><span className="block text-xs text-muted-foreground">Cliente</span><strong>{row.razon_social}</strong><span className="block text-xs">NIT {row.nit}</span></p>
        <p><span className="block text-xs text-muted-foreground">Valor</span><strong className="tabular-nums">{formatters.currency(Number(row.valor) || 0)}</strong></p>
        <p><span className="block text-xs text-muted-foreground">Fecha de transferencia</span>{formatters.dateOnly(row.fecha_transferencia)}</p>
        <p><span className="block text-xs text-muted-foreground">Cuenta destino</span>{row.id_cta_bancaria}</p>
        <p><span className="block text-xs text-muted-foreground">Referencia</span>{row.referencia || '—'}</p>
        <p><span className="block text-xs text-muted-foreground">C.O.</span>{row.id_co || '—'}</p>
        {row.observacion && <p className="sm:col-span-2"><span className="block text-xs text-muted-foreground">Observación</span>{row.observacion}</p>}
      </div>
      <div><h3 className="font-semibold">Facturas</h3>{row.facturas.length ? <ul className="mt-1 space-y-1">{row.facturas.map(f => <li key={f.rowid_sa} className="flex justify-between gap-3 border-b border-border py-1"><span>{f.documento}</span><span className="tabular-nums">Saldo {formatters.currency(Number(f.saldo) || 0)}</span></li>)}</ul> : <p className="text-muted-foreground">Sin facturas asociadas.</p>}</div>
      <div><h3 className="font-semibold">Soportes</h3><div className="mt-2 grid gap-2 sm:grid-cols-3">{row.soportes.map(s => <a key={s.id} href={soporteUrl(s.url)} target="_blank" rel="noopener noreferrer" className="flex min-w-0 flex-col items-center gap-2 rounded-lg border border-border p-2 text-center text-xs hover:bg-muted">
        {s.mime.startsWith('image/') ? <img src={soporteUrl(s.url)} alt={s.nombre_original} className="h-24 w-full rounded object-cover" /> : <FileText className="h-24 w-16 text-primary" />}<span className="w-full truncate" title={s.nombre_original}>{s.nombre_original}</span>
      </a>)}</div></div>
      <div className="rounded-lg bg-muted/50 p-3"><h3 className="font-semibold">Trazabilidad</h3><p>Solicitado por {row.created_by_usuario} el {formatters.dateTime(row.created_at)}</p>
        {row.revisado_at && <p>{row.estado === 'RECHAZADA' ? 'Rechazado' : 'Aprobado'} por {row.revisado_by_usuario || '—'} el {formatters.dateTime(row.revisado_at)}</p>}
        {row.motivo_rechazo && <p>Motivo: {row.motivo_rechazo}</p>}
        {row.usado_at && <p>Usado en RC {row.rc_numero || '—'} el {formatters.dateTime(row.usado_at)}</p>}
      </div>
      {row.estado === 'PENDIENTE' && <div className="space-y-2"><label className="flex cursor-pointer items-center gap-2"><Upload className="h-4 w-4" /> Agregar soporte<input type="file" multiple accept="image/jpeg,image/png,image/webp,application/pdf" className="sr-only" onChange={e => { setFiles(Array.from(e.target.files ?? [])); e.target.value = '' }} /></label>{files.length > 0 && <div><p className="text-xs">{files.map(f => f.name).join(', ')}</p><Button size="sm" variant="outline" disabled={saving} onClick={() => void subir()}>Subir {files.length} soporte(s)</Button></div>}</div>}
      {row.estado === 'PENDIENTE' && puedeAprobar && <div className="flex gap-2"><Button onClick={() => { setAccion('aprobar'); setValor(String(row.valor)); setError('') }}>Aprobar</Button><Button variant="destructive" onClick={() => { setAccion('rechazar'); setError('') }}>Rechazar</Button></div>}
      {(row.estado === 'PENDIENTE' || row.estado === 'APROBADA') && puedeAnular && <Button variant="outline" onClick={() => { setAccion('anular'); setError('') }}>Anular</Button>}
      {accion && <div className="space-y-3 rounded-lg border border-border p-3"><h3 className="font-semibold">{accion === 'aprobar' ? 'Confirmar aprobación' : accion === 'rechazar' ? 'Confirmar rechazo' : 'Confirmar anulación'}</h3>
        {accion === 'aprobar' && <label className="block space-y-1">Valor aprobado<Input type="number" min="0.01" step="0.01" className="text-right tabular-nums" value={valor} onChange={e => setValor(e.target.value)} /></label>}
        {accion === 'rechazar' && <label className="block space-y-1">Motivo (mínimo 5 caracteres)<textarea value={motivo} onChange={e => setMotivo(e.target.value)} rows={3} className="w-full rounded-md border border-input bg-background p-2" /></label>}
        <div className="flex gap-2"><Button onClick={() => void ejecutar()} disabled={saving}>Confirmar</Button><Button variant="outline" onClick={() => setAccion(null)} disabled={saving}>Cancelar</Button></div>
      </div>}
      {error && <p role="alert" className="text-destructive">{error}</p>}
    </div>}
  </Modal>
}
