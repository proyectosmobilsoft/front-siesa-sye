import type { TipoDiferencia } from '@/utils/reciboCajaCalculos'
import { formatters } from '@/utils/formatters'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

type Totales = { subtotal: number; descuento: number; neto: number; recibido: number; diferencia: number; clasificacion: { tipo: TipoDiferencia; monto: number } }
const etiquetas: Record<TipoDiferencia, string> = {
  none: 'Sin diferencia', ajusteDescuento: 'Ajuste al peso faltante', ajusteIngreso: 'Ajuste al peso sobrante',
  anticipo: 'Anticipo cliente', faltanteExcesivo: 'Faltante supera el límite',
}
export function ResumenRecibo({ totales, faltantes, guardando, onSave }: {
  totales: Totales; faltantes: string[]; guardando: boolean; onSave: () => void
}) {
  const button = <span className="block" title={faltantes[0]}><Button className="w-full" size="lg" disabled={guardando || faltantes.length > 0} onClick={onSave}>{guardando ? 'Guardando…' : 'Crear recibo'}</Button></span>
  const clasificacion = <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${totales.clasificacion.tipo === 'faltanteExcesivo' ? 'bg-red-500/10 text-red-700 dark:text-red-400' : totales.clasificacion.tipo === 'none' ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'bg-amber-500/10 text-amber-700 dark:text-amber-400'}`}>{etiquetas[totales.clasificacion.tipo]}</span>
  return <>
    <Card className="hidden h-fit space-y-4 rounded-2xl p-5 lg:sticky lg:top-4 lg:block">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Resumen</h2>
      <div className="space-y-2 text-sm">
        {([['Subtotal facturas', totales.subtotal], ['Descuento', -totales.descuento]] as const).map(([label, value]) => <div key={label} className="flex justify-between gap-3"><span className="text-muted-foreground">{label}</span><span className="tabular-nums">{formatters.currency(value)}</span></div>)}
      </div>
      <div className="border-y border-border py-4"><p className="text-xs font-medium text-muted-foreground">Neto a pagar</p><p className="text-3xl font-bold tabular-nums text-primary">{formatters.currency(totales.neto)}</p></div>
      <div className="space-y-2 text-sm"><div className="flex justify-between"><span>Recibido</span><b className="tabular-nums">{formatters.currency(totales.recibido)}</b></div><div className="flex justify-between"><span>Diferencia</span><b className="tabular-nums">{formatters.currency(totales.diferencia)}</b></div>{clasificacion}</div>
      <div className="border-t border-border pt-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Para guardar</p>
        <ul className="space-y-1 text-xs">
          {['Cliente', 'Al menos 1 factura', 'Pagos válidos', 'Observación'].map(item =>
            <li key={item} className={faltantes.includes(item) ? 'text-muted-foreground' : 'text-emerald-700 dark:text-emerald-400'}>
              {faltantes.includes(item) ? '○' : '✓'} {item}
            </li>)}
        </ul>
        {faltantes.filter(f => !['Cliente', 'Al menos 1 factura', 'Pagos válidos', 'Observación'].includes(f)).map(f =>
          <p key={f} className="mt-2 text-xs text-red-600 dark:text-red-400">{f}</p>)}
      </div>
      {button}
    </Card>
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card p-3 shadow-lg lg:hidden">
      <div className="mx-auto flex max-w-3xl items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground">Neto · Recibido {formatters.currency(totales.recibido)}</p>
          <p className="font-bold tabular-nums text-primary">{formatters.currency(totales.neto)}</p>
          <p className="truncate text-[11px] text-muted-foreground">{faltantes[0] ?? etiquetas[totales.clasificacion.tipo]} · Dif. {formatters.currency(totales.diferencia)}</p>
        </div>
        <div className="w-36">{button}</div>
      </div>
    </div>
  </>
}
