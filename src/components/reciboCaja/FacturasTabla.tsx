import type { FacturaRC } from '@/utils/reciboCajaCalculos'
import { elegibleDescuento, brutoFactura } from '@/utils/reciboCajaCalculos'
import { formatters } from '@/utils/formatters'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function FacturasTabla({ facturas, descuentos, aplicar, cargando, mas, onChange, onAll, onClear, onMore }: {
  facturas: FacturaRC[]; descuentos: Record<number, number>; aplicar: boolean
  cargando: boolean; mas: boolean
  onChange: (rowid: number, valor: number, seleccionada: boolean) => void
  onAll: () => void; onClear: () => void; onMore: () => void
}) {
  return <div className="space-y-3">
    <div className="flex flex-wrap gap-2">
      <Button size="sm" variant="outline" disabled={!facturas.length} onClick={onAll}>Seleccionar todas (pago completo)</Button>
      <Button size="sm" variant="ghost" disabled={!facturas.some(f => f.seleccionada)} onClick={onClear}>Limpiar</Button>
    </div>
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full min-w-[650px] text-sm">
        <thead className="bg-muted/50 text-xs text-muted-foreground"><tr>
          <th className="w-10 p-3" scope="col"><span className="sr-only">Elegir</span></th>
          <th className="p-3 text-left" scope="col">Documento</th>
          <th className="p-3 text-right" scope="col">Saldo</th>
          <th className="w-36 p-3 text-right" scope="col">Valor a pagar</th>
          <th className="p-3 text-right" scope="col">Descuento SAS</th>
          <th className="p-3 text-right" scope="col">Neto</th>
        </tr></thead>
        <tbody className="divide-y divide-border">
          {facturas.map(f => {
            const pp = descuentos[f.rowid] ?? 0
            const descuento = aplicar && elegibleDescuento(f, pp) ? pp : 0
            const neto = brutoFactura(f, aplicar, pp) - descuento
            const abono = f.seleccionada && f.valor < f.saldo - 0.01 && !elegibleDescuento(f, pp)
            return <tr key={f.rowid} className={f.seleccionada ? 'bg-primary/5' : ''}>
              <td className="p-3"><input type="checkbox" aria-label={`Seleccionar ${f.tipo}-${f.consecutivo}`} checked={f.seleccionada} onChange={e => onChange(f.rowid, e.target.checked ? f.saldo : 0, e.target.checked)} className="h-4 w-4 accent-primary" /></td>
              <td className="p-3"><span className="font-semibold">{f.tipo}-{f.consecutivo}</span><div className="mt-1 flex gap-1">{abono && <Badge variant="secondary">Abono</Badge>}{f.seleccionada && pp > 0 && <Badge variant="outline">Pronto pago</Badge>}</div></td>
              <td className="p-3 text-right tabular-nums">{formatters.currency(f.saldo)}</td>
              <td className="p-3"><Input type="number" min="0" max={f.saldo} step="0.01" aria-label={`Valor a pagar ${f.tipo}-${f.consecutivo}`} className="text-right tabular-nums" value={f.valor || ''} placeholder="0" onChange={e => { const value = Number(e.target.value); onChange(f.rowid, value, value > 0) }} /></td>
              <td className="p-3 text-right tabular-nums text-muted-foreground">{pp > 0 ? formatters.currency(pp) : '—'}</td>
              <td className="p-3 text-right font-semibold tabular-nums">{f.seleccionada ? formatters.currency(neto) : '—'}</td>
            </tr>
          })}
        </tbody>
      </table>
      {!cargando && !facturas.length && <p className="p-5 text-center text-sm text-muted-foreground">No hay facturas abiertas.</p>}
    </div>
    {cargando && <p className="text-xs text-muted-foreground">Cargando facturas…</p>}
    {mas && <Button variant="outline" disabled={cargando} onClick={onMore}>Cargar más</Button>}
  </div>
}
