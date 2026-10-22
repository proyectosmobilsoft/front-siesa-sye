import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { transferenciasConfirmacionApi } from '@/api/transferenciasConfirmacion'
import { usePermiso } from '@/hooks/usePermiso'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatters } from '@/utils/formatters'
import { validarSoportes } from './soportes'
import { ZonaSoportes } from './ZonaSoportes'
import { SoporteProtegido } from './SoporteProtegido'
import { Cargando } from '@/components/ui/cargando'
import { duracion } from './tiempos'
import { facturaTexto, medioTexto, resumenPayload } from './payload'

const errorMensaje = (error: unknown) => (error as { response?: { data?: { message?: string } }; message?: string }).response?.data?.message || (error as Error).message || 'No se pudo completar la operación'
type Accion = 'aprobar' | 'rechazar' | 'anular' | 'reintentar' | null
export function DetalleConfirmacionModal({ id, onClose, onSaved }: { id: number; onClose: () => void; onSaved: (message: string, keepOpen?: boolean) => void }) {
  const { puede, P, sesion } = usePermiso()
  const queryClient = useQueryClient()
  const [accion, setAccion] = useState<Accion>(null)
  const [valor, setValor] = useState('')
  const [motivo, setMotivo] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [resultado, setResultado] = useState('')
  const detalle = useQuery({ queryKey: ['transferencias-confirmacion', 'detalle', id], queryFn: () => transferenciasConfirmacionApi.detalle(id) })
  const row = detalle.data
  const puedeAprobar = puede(P.APROBAR_TRANSFERENCIA)
  const puedeAnular = row && (row.created_by_usuario === sesion?.usuario || puedeAprobar)
  const ejecutar = async () => {
    if (!row || !accion) return
    if (accion === 'aprobar' && row.tiene_payload && !(Number(valor) > 0)) { setError('Ingresa un valor mayor que cero.'); return }
    if (accion === 'rechazar' && motivo.trim().length < 5) { setError('El motivo debe tener al menos 5 caracteres.'); return }
    setSaving(true); setError('')
    try {
      if (accion === 'aprobar' || accion === 'reintentar') {
        const response = accion === 'aprobar' ? await transferenciasConfirmacionApi.aprobar(id, row.tiene_payload ? Number(valor) : undefined) : await transferenciasConfirmacionApi.reintentarRc(id)
        if (row.tiene_payload) {
          const actualizado = await detalle.refetch()
          const numero = actualizado.data?.rc_numero || response.data?.rc_numero
          setAccion(null)
          setResultado(numero ? `RC ${numero} creado correctamente.` : 'RC creado correctamente.')
          onSaved(numero ? `RC ${numero} creado correctamente` : 'RC creado correctamente', true)
          return
        }
      }
      if (accion === 'rechazar') await transferenciasConfirmacionApi.rechazar(id, motivo.trim())
      if (accion === 'anular') await transferenciasConfirmacionApi.anular(id)
      onSaved({ aprobar: 'Transferencia aprobada', rechazar: 'Transferencia rechazada', anular: 'Transferencia anulada', reintentar: 'RC creado' }[accion])
    } catch (e) { setError(errorMensaje(e)); await detalle.refetch(); void queryClient.invalidateQueries({ queryKey: ['transferencias-confirmacion', 'lista'] }); void queryClient.invalidateQueries({ queryKey: ['transferencias-confirmacion', 'resumen'] }) } finally { setSaving(false) }
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
    {detalle.isLoading && <Cargando compacto texto="Cargando detalle" />}
    {detalle.isError && <p role="alert" className="text-sm text-destructive">{errorMensaje(detalle.error)}</p>}
    {row && <div className="space-y-5 text-sm">
      {resultado && <p role="status" className="rounded-lg border border-green-500/30 p-3 text-green-700 dark:text-green-400">{resultado}</p>}
      <div className="space-y-3">
        <div className="flex flex-wrap items-start gap-2">
              {row.estado === 'PENDIENTE' && puedeAprobar && <div className="flex gap-2"><Button onClick={() => { setAccion('aprobar'); setValor(String(row.valor)); setError('') }}>{row.tiene_payload ? 'Aprobar y crear RC' : 'Aprobar'}</Button><Button variant="destructive" onClick={() => { setAccion('rechazar'); setError('') }}>Rechazar</Button></div>}
              {row.estado === 'APROBADA' && row.tiene_payload && row.rc_error && puedeAprobar && <Button onClick={() => { setAccion('reintentar'); setError('') }}>Reintentar RC</Button>}
              {(row.estado === 'PENDIENTE' || row.estado === 'APROBADA') && puedeAnular && <Button variant="outline" onClick={() => { setAccion('anular'); setError('') }}>Anular</Button>}
        </div>
      {accion && <div className="space-y-3 rounded-lg border border-border p-3"><h3 className="font-semibold">{accion === 'aprobar' ? 'Confirmar aprobación' : accion === 'rechazar' ? 'Confirmar rechazo' : accion === 'reintentar' ? 'Confirmar reintento de RC' : 'Confirmar anulación'}</h3>
        {(accion === 'aprobar' || accion === 'reintentar') && row.tiene_payload && <p>Se creará el RC a nombre de {row.conductor_nombre || 'el conductor'} con fecha y hora de ahora.</p>}
        {accion === 'aprobar' && (row.tiene_payload ? <label className="block space-y-1">Valor informativo aprobado<Input type="number" min="0.01" step="0.01" className="text-right tabular-nums" value={valor} onChange={e => setValor(e.target.value)} /></label> : <p>¿Aceptar la transferencia por {formatters.currency(Number(row.valor) || 0)}? El conductor podrá finalizar el recaudo cuando todas sus transferencias estén aprobadas.</p>)}
        {accion === 'rechazar' && <label className="block space-y-1">Motivo (mínimo 5 caracteres)<textarea value={motivo} onChange={e => setMotivo(e.target.value)} rows={3} className="w-full rounded-md border border-input bg-background p-2" /></label>}
        <div className="flex gap-2"><Button onClick={() => void ejecutar()} disabled={saving}>Confirmar</Button><Button variant="outline" onClick={() => setAccion(null)} disabled={saving}>Cancelar</Button></div>
      </div>}
      {error && <p role="alert" className="text-destructive">{error}</p>}
      </div>
      <div className="grid gap-3 rounded-lg border border-border p-3 sm:grid-cols-2">
        <p><span className="block text-xs text-muted-foreground">Cliente</span><strong>{row.razon_social}</strong><span className="block text-xs">NIT {row.nit}</span></p>
        <p><span className="block text-xs text-muted-foreground">Valor</span><strong className="tabular-nums">{formatters.currency(Number(row.valor) || 0)}</strong></p>
        <p><span className="block text-xs text-muted-foreground">Fecha de transferencia</span>{formatters.dateOnly(row.fecha_transferencia)}</p>
        <p><span className="block text-xs text-muted-foreground">Cuenta destino</span>{row.id_cta_bancaria}</p>
        <p><span className="block text-xs text-muted-foreground">Referencia</span>{row.referencia || '—'}</p>
        <p><span className="block text-xs text-muted-foreground">C.O.</span>{row.id_co || '—'}</p>
        {row.conductor_id != null && <p><span className="block text-xs text-muted-foreground">Conductor</span>{row.conductor_nombre || '—'}</p>}
        {row.observacion && <p className="sm:col-span-2"><span className="block text-xs text-muted-foreground">Observación</span>{row.observacion}</p>}
      </div>
      {row.tiene_payload && <div className="rounded-lg border border-border p-3"><h3 className="font-semibold">Datos del recibo</h3><p>Cliente: {typeof resumenPayload(row)?.cliente === 'string' ? resumenPayload(row)?.cliente as string : row.razon_social}</p><p>Valor: {formatters.currency(Number(resumenPayload(row)?.valor ?? row.valor))}</p><p>Facturas: {resumenPayload(row)?.facturas?.map(facturaTexto).join(', ') || '—'}</p><p>Medios: {resumenPayload(row)?.medios?.map(medioTexto).join(', ') || '—'}</p></div>}
      <div><h3 className="font-semibold">Facturas</h3>{row.facturas.length ? <ul className="mt-1 space-y-1">{row.facturas.map(f => <li key={f.rowid_sa} className="flex justify-between gap-3 border-b border-border py-1"><span>{f.documento}</span><span className="tabular-nums">Saldo {formatters.currency(Number(f.saldo) || 0)}</span></li>)}</ul> : <p className="text-muted-foreground">Sin facturas asociadas.</p>}</div>
      <div><h3 className="font-semibold">Soportes</h3><div className="mt-2 grid gap-2 sm:grid-cols-3">{row.soportes.map(s => <SoporteProtegido key={s.id} url={s.url} mime={s.mime} nombre={s.nombre_original} variante="tarjeta" />)}</div></div>
      <div className="rounded-lg bg-muted/50 p-3"><h3 className="font-semibold">Trazabilidad</h3><p>Enviado por {row.conductor_nombre || row.created_by_usuario} el {formatters.dateTime(row.created_at)}</p>
        {row.revisado_at && <p>{row.estado === 'RECHAZADA' ? 'Rechazado' : 'Aprobado'} por {row.revisado_by_usuario || '—'} el {formatters.dateTime(row.revisado_at)}</p>}
        {row.segundos_espera != null && <p>Duración de espera: {duracion(row.segundos_espera)}</p>}
        {row.motivo_rechazo && <p>Motivo: {row.motivo_rechazo}</p>}
        {row.rc_creado_at && <p>RC {row.rc_numero || '—'} creado el {formatters.dateTime(row.rc_creado_at)}</p>}
        {row.rc_error && <p role="alert" className="text-destructive">Error al crear RC: {row.rc_error}</p>}
        {row.usado_at && <p>Usado en RC {row.rc_numero || '—'} el {formatters.dateTime(row.usado_at)}</p>}
      </div>
      {row.estado === 'PENDIENTE' && <div className="space-y-2">
        <h3 className="font-semibold">Agregar soportes</h3>
        <ZonaSoportes archivos={files} disabled={saving} ayuda={`Se permiten hasta ${Math.max(0, 10 - row.soportes.length)} más (máximo 10 en total).`}
          onAgregar={nuevos => { const mensaje = validarSoportes(nuevos, row.soportes.length + files.length); if (mensaje) { setError(mensaje); return } setError(''); setFiles(prev => [...prev, ...nuevos]) }}
          onQuitar={i => setFiles(prev => prev.filter((_, index) => index !== i))} />
        {files.length > 0 && <Button size="sm" variant="outline" disabled={saving} onClick={() => void subir()}>Subir {files.length} soporte(s)</Button>}
      </div>}
    </div>}
  </Modal>
}
