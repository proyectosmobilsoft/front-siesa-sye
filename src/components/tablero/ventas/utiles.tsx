import { clsx } from 'clsx'
import { dinero, porcentaje } from '../formato'

import { colorCumplimiento } from './colores'
export function Progreso({ valor }: { valor: number | null }) {
  return (
    <span className="inline-flex min-w-28 items-center gap-2">
      <span className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
        <span
          className={clsx(
            'block h-full rounded-full',
            colorCumplimiento(valor)
          )}
          style={{
            width: `${Math.min(100, Math.max(0, (valor ?? 0) * 100))}%`,
          }}
        />
      </span>
      <span>{valor == null ? '—' : porcentaje(valor, 0)}</span>
    </span>
  )
}
export function Diferencia({
  venta,
  meta,
}: {
  venta: number
  meta: number | null
}) {
  if (meta == null) return <>—</>
  const falta = meta - venta
  return (
    <span
      className={
        falta <= 0
          ? 'text-emerald-600 dark:text-emerald-400'
          : 'text-red-600 dark:text-red-400'
      }
    >
      {falta <= 0 ? `+${dinero(-falta)}` : dinero(falta)}
    </span>
  )
}
