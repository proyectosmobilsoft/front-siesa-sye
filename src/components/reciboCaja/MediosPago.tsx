import type { CuentaBancariaConfig } from '@/api/maestroCuentasBancarias'
import type { PagoRC } from '@/utils/reciboCajaCalculos'
import { formatters } from '@/utils/formatters'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { FechaInput } from '@/components/ui/fecha-input'

const field = 'block space-y-1.5 text-xs font-medium text-muted-foreground'
export function MediosPago({ pagos, editados, cuentas, onChange, onAdd, onRemove }: {
  pagos: PagoRC[]; editados: Set<string>; cuentas: CuentaBancariaConfig[]
  onChange: (id: string, patch: Partial<PagoRC>, valorManual?: boolean) => void
  onAdd: () => void; onRemove: (id: string) => void
}) {
  return <div className="space-y-3">
    <div className="flex items-center justify-between gap-3"><p className="text-xs text-muted-foreground">El último valor automático cubre el neto pendiente.</p><Button size="sm" variant="outline" onClick={onAdd}>+ Agregar medio</Button></div>
    {pagos.map((p, index) => <div key={p.id} className="rounded-xl border border-border p-3 sm:p-4">
      <div className="mb-3 flex items-center justify-between"><span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Medio {index + 1}</span>{pagos.length > 1 && <Button size="sm" variant="ghost" onClick={() => onRemove(p.id)}>Quitar</Button>}</div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className={field}>Tipo<Select value={p.codigo} onChange={e => onChange(p.id, { codigo: e.target.value as PagoRC['codigo'] })}><option value="EFE">Efectivo</option><option value="CG1">Transferencia / consignación</option><option value="TC">Tarjeta crédito</option><option value="TD">Tarjeta débito</option></Select></label>
        <label className={field}>Valor<Input type="number" min="0" step="0.01" value={p.valor || ''} className="text-right tabular-nums" onChange={e => onChange(p.id, { valor: Number(e.target.value) }, true)} /></label>
      </div>
      {!editados.has(p.id) && <p className="mt-1 text-right text-[11px] text-muted-foreground">Automático · {formatters.currency(p.valor)}</p>}
      {p.codigo === 'CG1' && <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className={field}>Cuenta bancaria<Select value={p.cuenta} onChange={e => onChange(p.id, { cuenta: e.target.value })}><option value="">Seleccionar cuenta</option>{cuentas.map(b => <option key={b.id} value={b.f026_id}>{b.f026_id} · {b.f026_descripcion}</option>)}</Select></label>
        <label className={field}>Fecha consignación<FechaInput value={p.fechaConsignacion} onChange={v => onChange(p.id, { fechaConsignacion: v })} /></label>
      </div>}
      {(p.codigo === 'TC' || p.codigo === 'TD') && <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <label className={field}>Últimos 4 dígitos<Input inputMode="numeric" maxLength={4} value={p.nroTarjeta} onChange={e => onChange(p.id, { nroTarjeta: e.target.value.replace(/\D/g, '').slice(0, 4) })} /></label>
        <label className={field}>Autorización<Input value={p.autorizacion} onChange={e => onChange(p.id, { autorizacion: e.target.value })} /></label>
        <label className={field}>Vencimiento<Input type="month" value={p.vencimiento} onChange={e => onChange(p.id, { vencimiento: e.target.value })} /></label>
      </div>}
      {p.codigo !== 'EFE' && <label className={`${field} mt-3`}>Voucher (opcional)<Input value={p.voucher} onChange={e => onChange(p.id, { voucher: e.target.value })} /></label>}
    </div>)}
  </div>
}
