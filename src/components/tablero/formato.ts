/** Formatos y rangos de fechas compartidos por los dashboards (mismo criterio que vehiman_react). */

export const dinero = (v: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v)
export const entero = (v: number) => new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(v)
export const decimal = (v: number, d = 1) => new Intl.NumberFormat('es-CO', { minimumFractionDigits: d, maximumFractionDigits: d }).format(v)
export const porcentaje = (v: number, d = 1) => `${decimal(v * 100, d)} %`
export const kilos = (v: number) => (Math.abs(v) >= 1000 ? `${decimal(v / 1000, 1)} t` : `${entero(v)} kg`)

/** 1.250.000 → "1,3 M"; evita que el eje ocupe medio gráfico en móvil. */
export const compacto = (v: number) => new Intl.NumberFormat('es-CO', { notation: 'compact', maximumFractionDigits: 1 }).format(v)

export const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

/** "2026-09" → "Sep 26". */
export const etiquetaMes = (mes: string) => `${MESES[Number(mes.slice(5, 7)) - 1]} ${mes.slice(2, 4)}`

/**
 * Paleta categórica de vehiman_react, validada con el validador de dataviz en
 * claro (#fcfcfb) y oscuro (#1a1a1a). Se asigna en este orden, nunca cíclica;
 * el par naranja↔verde queda en la franja CVD 6-8, así que siempre va con
 * leyenda o etiqueta directa.
 */
export const PALETA = ['#1a73d9', '#15935b', '#c26a06', '#7c5cd6', '#0e9aa7', '#d33a3a']

export type PresetRango = '30d' | 'mes' | 'anio' | '12m'

export const PRESETS: { valor: PresetRango; etiqueta: string }[] = [
  { valor: '30d', etiqueta: '30 días' },
  { valor: 'mes', etiqueta: 'Este mes' },
  { valor: 'anio', etiqueta: 'Este año' },
  { valor: '12m', etiqueta: '12 meses' },
]

// `sv-SE` formatea como aaaa-mm-dd en la hora local (toISOString correría el día por la zona horaria).
const iso = (d: Date) => d.toLocaleDateString('sv-SE')

export function rangoDePreset(preset: PresetRango, hoy = new Date()): { desde: string; hasta: string } {
  const hasta = iso(hoy)
  switch (preset) {
    case '30d':
      return { desde: iso(new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - 29)), hasta }
    case 'mes':
      return { desde: iso(new Date(hoy.getFullYear(), hoy.getMonth(), 1)), hasta }
    case 'anio':
      return { desde: `${hoy.getFullYear()}-01-01`, hasta }
    case '12m':
      return { desde: iso(new Date(hoy.getFullYear(), hoy.getMonth() - 11, 1)), hasta }
  }
}
