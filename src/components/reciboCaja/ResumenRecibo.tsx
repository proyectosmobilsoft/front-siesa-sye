import type { TipoDiferencia } from '@/utils/reciboCajaCalculos'
import { formatters } from '@/utils/formatters'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { AlertCircle, X } from 'lucide-react'

type Totales = { subtotal: number; descuento: number; neto: number; recibido: number; diferencia: number; clasificacion: { tipo: TipoDiferencia; monto: number } }
const etiquetas: Record<TipoDiferencia, string> = {
  none: 'Sin diferencia', ajusteDescuento: 'Ajuste al peso faltante', ajusteIngreso: 'Ajuste al peso sobrante',
  anticipo: 'Anticipo cliente', faltanteExcesivo: 'Faltante supera el límite',
}
export function ResumenRecibo({ totales, faltantes, guardando, verificando, error, onDismissError, onSave }: {
  totales: Totales; faltantes: string[]; guardando: boolean; verificando: boolean; error?: string; onDismissError?: () => void; onSave: () => void
}) {
  const alerta = error ? <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-red-700 dark:text-red-400">
    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
    <p className="min-w-0 flex-1 text-xs leading-snug">{error}</p>
    {onDismissError && <button type="button" aria-label="Cerrar" onClick={onDismissError} className="rounded p-0.5 opacity-70 hover:opacity-100"><X className="h-3.5 w-3.5" /></button>}
  </div> : null
  const button = <span className="block" title={faltantes[0]}><Button className="h-9 w-full" size="sm" disabled={guardando || verificando || faltantes.length > 0} onClick={onSave}>{verificando ? 'Verificando…' : guardando ? 'Guardando…' : 'Crear recibo'}</Button></span>
  const clasificacion = <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${totales.clasificacion.tipo === 'faltanteExcesivo' ? 'bg-red-500/10 text-red-700 dark:text-red-400' : totales.clasificacion.tipo === 'none' ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'bg-amber-500/10 text-amber-700 dark:text-amber-400'}`}>{etiquetas[totales.clasificacion.tipo]}</span>
  return <>
    <Card className="hidden rounded-xl p-4 lg:sticky lg:top-0 lg:flex lg:max-h-full lg:flex-col lg:gap-3">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Resumen</h2>
      <div className="space-y-2 text-sm">
        {([['Subtotal facturas', totales.subtotal], ['Descuento', -totales.descuento]] as const).map(([label, value]) => <div key={label} className="flex justify-between gap-3"><span className="text-muted-foreground">{label}</span><span className="tabular-nums">{formatters.currency(value)}</span></div>)}
      </div>
      <div className="border-y border-border py-2"><p className="text-xs font-medium text-muted-foreground">Neto a pagar</p><p className="text-right text-2xl font-bold tabular-nums text-primary">{formatters.currency(totales.neto)}</p></div>
      <div className="space-y-2 text-sm"><div className="flex justify-between"><span>Recibido</span><b className="tabular-nums">{formatters.currency(totales.recibido)}</b></div><div className="flex justify-between"><span>Diferencia</span><b className="tabular-nums">{formatters.currency(totales.diferencia)}</b></div>{clasificacion}</div>
      <div className="border-t border-border pt-2">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Para guardar</p>
        <ul className="space-y-1 text-xs">
          {['Cliente', 'Al menos 1 factura', 'Pagos válidos', 'Observación'].map(item =>
            <li key={item} className={faltantes.includes(item) ? 'text-muted-foreground' : 'text-emerald-700 dark:text-emerald-400'}>
              {faltantes.includes(item) ? '○' : '✓'} {item}
            </li>)}
        </ul>
        {faltantes.filter(f => !['Cliente', 'Al menos 1 factura', 'Pagos válidos', 'Observación'].includes(f)).map(f =>
          <p key={f} className="mt-2 text-xs text-red-600 dark:text-red-400">{f}</p>)}
      </div>
      <div className="mt-auto space-y-2">{alerta}{button}</div>
    </Card>
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card p-3 shadow-lg lg:hidden">
      {alerta && <div className="mx-auto mb-2 max-w-3xl">{alerta}</div>}
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
