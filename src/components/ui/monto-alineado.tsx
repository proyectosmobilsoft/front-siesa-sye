import { formatters } from '@/utils/formatters'

export function MontoAlineado({ value, alinear = 'izquierda' }: { value: number; alinear?: 'izquierda' | 'derecha' }) {
  const numero = formatters.currency(Math.abs(value)).replace(/^\$\s*/, '')

  return (
    <span className="inline-grid grid-cols-[0.75rem_minmax(10ch,auto)] justify-start gap-1 tabular-nums">
      <span>$</span>
      <span className={alinear === 'derecha' ? 'text-right' : 'text-left'}>{value < 0 ? `-${numero}` : numero}</span>
    </span>
  )
}
