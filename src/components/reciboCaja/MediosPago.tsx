import { Banknote, CreditCard, Landmark, X } from 'lucide-react'
import type { ComponentType } from 'react'
import type { CuentaBancariaConfig } from '@/api/maestroCuentasBancarias'
import type { PagoRC } from '@/utils/reciboCajaCalculos'
import { formatters } from '@/utils/formatters'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { FechaInput } from '@/components/ui/fecha-input'

type Codigo = PagoRC['codigo']
const METODOS: { codigo: Codigo; label: string; icon: ComponentType<{ className?: string }> }[] = [
  { codigo: 'EFE', label: 'Efectivo', icon: Banknote },
  { codigo: 'CG1', label: 'Transferencia / consignación', icon: Landmark },
  { codigo: 'TC', label: 'Tarjeta crédito', icon: CreditCard },
  { codigo: 'TD', label: 'Tarjeta débito', icon: CreditCard },
]
const etiqueta = (codigo: Codigo) => METODOS.find(m => m.codigo === codigo)?.label ?? codigo

const field = 'block min-w-0 space-y-0.5 text-xs font-medium text-muted-foreground'
export function MediosPago({ pagos, editados, cuentas, onChange, onAdd, onRemove }: {
  pagos: PagoRC[]; editados: Set<string>; cuentas: CuentaBancariaConfig[]
  onChange: (id: string, patch: Partial<PagoRC>, valorManual?: boolean) => void
  onAdd: (codigo: Codigo) => void; onRemove: (id: string) => void
}) {
  return <div className="space-y-3">
    <div>
      <p className="text-sm font-medium">¿Cómo pagó?</p>
      <p className="text-[11px] text-muted-foreground">Toca un método para agregarlo. Puedes combinar varios.</p>
    </div>
    <div className="flex flex-wrap gap-2">
      {METODOS.map(m => {
        const n = pagos.filter(p => p.codigo === m.codigo).length
        const Icon = m.icon
        return <button key={m.codigo} type="button" onClick={() => onAdd(m.codigo)}
          className={`flex h-11 items-center gap-2 rounded-xl border bg-background px-3 text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${n ? 'border-primary' : 'border-border'}`}>
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary"><Icon className="h-4 w-4" /></span>
          {m.label}
          {n > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-xs font-bold text-primary-foreground">{n}</span>}
        </button>
      })}
    </div>
    {pagos.length === 0 && <p className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">Aún no has agregado ningún pago.</p>}
    {pagos.map(p => <div key={p.id} className="rounded-xl border border-border bg-muted/30 p-3">
      <div className="flex flex-wrap items-end gap-2">
        <span className="min-w-28 pb-2 text-sm font-semibold">{etiqueta(p.codigo)}</span>
        <label className={`${field} ml-auto w-40`}>Valor
          <Input type="number" min="0" step="0.01" value={p.valor || ''} aria-label="Valor recibido" className="h-10 text-right font-semibold tabular-nums" onChange={e => onChange(p.id, { valor: Number(e.target.value) }, true)} />
        </label>
        <Button size="icon" variant="ghost" className="h-10 w-10 shrink-0" aria-label="Quitar pago" onClick={() => onRemove(p.id)}><X className="h-4 w-4" /></Button>
      </div>
      {!editados.has(p.id) && <p className="mt-0.5 text-right text-[11px] text-muted-foreground">Automático · {formatters.currency(p.valor)}</p>}
      {p.codigo === 'CG1' && <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <label className={field}>Cuenta bancaria<Select className="h-9 text-sm" value={p.cuenta} onChange={e => onChange(p.id, { cuenta: e.target.value })}><option value="">Seleccionar cuenta</option>{cuentas.map(b => <option key={b.id} value={b.f026_id}>{b.f026_id} · {b.f026_descripcion}</option>)}</Select></label>
        <label className={field}>Fecha consignación<FechaInput className="h-9" value={p.fechaConsignacion} onChange={v => onChange(p.id, { fechaConsignacion: v })} /></label>
      </div>}
      {(p.codigo === 'TC' || p.codigo === 'TD') && <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <label className={field}>Últimos 4 dígitos<Input className="h-9" inputMode="numeric" maxLength={4} value={p.nroTarjeta} onChange={e => onChange(p.id, { nroTarjeta: e.target.value.replace(/\D/g, '').slice(0, 4) })} /></label>
        <label className={field}>Autorización<Input className="h-9" value={p.autorizacion} onChange={e => onChange(p.id, { autorizacion: e.target.value })} /></label>
      </div>}
      {p.codigo !== 'EFE' && <label className={`${field} mt-2`}>Voucher (opcional)<Input className="h-9" value={p.voucher} onChange={e => onChange(p.id, { voucher: e.target.value })} /></label>}
    </div>)}
  </div>
}
