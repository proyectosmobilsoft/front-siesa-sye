import type { FacturaRC } from '@/utils/reciboCajaCalculos'
import { elegibleDescuento, brutoFactura } from '@/utils/reciboCajaCalculos'
import { formatters } from '@/utils/formatters'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function FacturasTabla({ facturas, descuentos, descuentosSugeridos, descuentosManuales, aplicar, cargando, mas, onChange, onDescuento, onRestaurar, onAll, onClear, onMore }: {
  facturas: FacturaRC[]; descuentos: Record<number, number>; descuentosSugeridos: Record<number, number>; descuentosManuales: Record<number, number>; aplicar: boolean
  cargando: boolean; mas: boolean
  onChange: (rowid: number, valor: number, seleccionada: boolean) => void
  onDescuento: (rowid: number, valor: number) => void; onRestaurar: (rowid: number) => void
  onAll: () => void; onClear: () => void; onMore: () => void
}) {
  return <div className="flex min-h-0 flex-1 flex-col gap-2">
    <div className="flex shrink-0 flex-wrap items-center gap-1">
      <h2 className="mr-auto text-xs font-semibold uppercase tracking-wider text-muted-foreground">Facturas</h2>
      <Button size="sm" className="h-7 px-2 text-xs" variant="outline" disabled={!facturas.length} onClick={onAll}>Seleccionar todas (pago completo)</Button>
      <Button size="sm" className="h-7 px-2 text-xs" variant="ghost" disabled={!facturas.some(f => f.seleccionada)} onClick={onClear}>Limpiar</Button>
    </div>
    <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-border max-lg:max-h-96">
      <table className="w-full min-w-[650px] text-sm">
        <thead className="sticky top-0 z-10 bg-muted text-xs text-muted-foreground"><tr>
          <th className="w-10 px-2 py-1.5" scope="col"><span className="sr-only">Elegir</span></th>
          <th className="px-2 py-1.5 text-left" scope="col">Documento</th>
          <th className="px-2 py-1.5 text-right" scope="col">Saldo</th>
          <th className="w-32 px-2 py-1.5 text-right" scope="col">Valor a pagar</th>
          <th className="px-2 py-1.5 text-right" scope="col">Desc. financiero</th>
          <th className="px-2 py-1.5 text-right" scope="col">Neto</th>
        </tr></thead>
        <tbody className="divide-y divide-border">
          {facturas.map(f => {
            const pp = descuentos[f.rowid] ?? 0
            const sugerido = descuentosSugeridos[f.rowid] ?? 0
            const manual = Object.prototype.hasOwnProperty.call(descuentosManuales, f.rowid)
            const elegible = elegibleDescuento(f, pp) || elegibleDescuento(f, sugerido)
            const descuento = aplicar && elegibleDescuento(f, pp) ? pp : 0
            const neto = brutoFactura(f, aplicar, pp) - descuento
            const abono = f.seleccionada && f.valor < f.saldo - 0.01 && !elegibleDescuento(f, pp)
            return <tr key={f.rowid} className={f.seleccionada ? 'bg-primary/5' : ''}>
              <td className="px-2 py-1.5"><input type="checkbox" aria-label={`Seleccionar ${f.tipo}-${f.consecutivo}`} checked={f.seleccionada} onChange={e => onChange(f.rowid, e.target.checked ? f.saldo : 0, e.target.checked)} className="h-4 w-4 accent-primary" /></td>
              <td className="px-2 py-1.5"><span className="font-semibold">{f.tipo}-{f.consecutivo}</span><div className="mt-0.5 flex gap-1"><Badge variant="secondary">C.O. {f.idCo || '—'}</Badge>{abono && <Badge variant="secondary">Abono</Badge>}{f.seleccionada && pp > 0 && <Badge variant="outline">Pronto pago</Badge>}</div></td>
              <td className="px-2 py-1.5 text-right tabular-nums">{formatters.currency(f.saldo)}</td>
              <td className="px-2 py-1.5"><Input type="number" min="0" max={f.saldo} step="0.01" aria-label={`Valor a pagar ${f.tipo}-${f.consecutivo}`} className="h-8 text-right tabular-nums" value={f.valor || ''} placeholder="0" onChange={e => { const value = Number(e.target.value); onChange(f.rowid, value, value > 0) }} /></td>
              <td className="px-2 py-1.5 text-right tabular-nums">{elegible ? <><Input type="number" min="0" max={f.saldo} step="0.01" aria-label={`Descuento financiero ${f.tipo}-${f.consecutivo}`} className={`ml-auto h-8 w-28 text-right tabular-nums ${!Number.isFinite(pp) || pp < 0 || pp >= f.saldo ? 'border-destructive' : ''}`} value={pp} onChange={e => onDescuento(f.rowid, e.target.value === '' ? 0 : Number(e.target.value))} />{manual && <div className="mt-1 text-[11px] text-muted-foreground">Sugerido {formatters.currency(sugerido)} <button type="button" className="text-primary underline" onClick={() => onRestaurar(f.rowid)}>restaurar</button></div>}</> : formatters.currency(0)}</td>
              <td className="px-2 py-1.5 text-right font-semibold tabular-nums">{formatters.currency(f.seleccionada ? neto : 0)}</td>
            </tr>
          })}
        </tbody>
      </table>
      {!cargando && !facturas.length && <p className="p-5 text-center text-sm text-muted-foreground">No hay facturas abiertas.</p>}
    </div>
    {cargando && <p className="text-xs text-muted-foreground">Cargando facturas…</p>}
    {mas && <Button size="sm" className="h-7 self-start text-xs" variant="outline" disabled={cargando} onClick={onMore}>Cargar más</Button>}
  </div>
}
