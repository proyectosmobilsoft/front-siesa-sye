export type Tono = 'green' | 'red' | 'yellow' | 'blue' | 'emerald' | 'amber'

const TONOS: Record<Tono, string> = {
  green: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  red: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400',
  yellow: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  blue: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400',
  emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
  amber: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
}

export const badgeClass = (tono: Tono) => TONOS[tono]

/** Estado de recibo de caja SIESA: 3 aprobado, 2 anulado, resto en proceso. */
export const estadoRCBadge = (estado: number) =>
  estado === 3 ? badgeClass('green') : estado === 2 ? badgeClass('red') : badgeClass('yellow')

export const estadoRCLabel = (estado: number) =>
  estado === 3 ? 'Aprobado' : estado === 2 ? 'Anulado' : 'En proceso'
