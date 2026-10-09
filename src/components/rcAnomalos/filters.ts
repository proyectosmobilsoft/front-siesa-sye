import type { AnomaliaRc, RcAnomalo } from '@/api/rcAnomalias'

export const canalRc = (rc: RcAnomalo): 'APP' | 'WEB' | 'SIESA' =>
  rc.canal ?? (rc.origen === 'API' ? 'APP' : 'SIESA')

export const etiquetaCanal = (rc: RcAnomalo) => {
  const canal = canalRc(rc)
  return canal === 'APP' ? 'App' : canal === 'WEB' ? 'Web' : 'SIESA'
}

const numero = (value: unknown): number | null => {
  if (typeof value !== 'number' && (typeof value !== 'string' || !value.trim())) return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

/** Devuelve el monto de una anomalía, si su detalle contiene importes comparables. */
export function diferenciaAnomalia(anomalia: AnomaliaRc): number | null {
  const buscar = (detalle: Record<string, unknown>): number | null => {
    for (const key of ['diferencia', 'diferencia_total', 'sobrante', 'faltante', 'descuadre', 'monto_diferencia', 'valor_diferencia']) {
      const valor = numero(detalle[key])
      if (valor !== null) return Math.abs(valor)
    }
    const esperado = numero(detalle.esperado ?? detalle.valor_esperado ?? detalle.descuento_esperado)
    const aplicado = numero(detalle.aplicado ?? detalle.valor_aplicado ?? detalle.descuento_aplicado)
    if (esperado !== null && aplicado !== null) return Math.abs(aplicado - esperado)
    for (const [izquierda, derecha] of [
      ['total_db', 'total_cr'], ['debito', 'credito'], ['total_cabecera', 'total_lineas'],
      ['total_medios', 'total_recibo'], ['cabecera', 'lineas'],
    ]) {
      const a = numero(detalle[izquierda])
      const b = numero(detalle[derecha])
      if (a !== null && b !== null) return Math.abs(a - b)
    }
    const importes = Object.entries(detalle).filter(([key]) => /^(monto|valor|importe|ajuste|anticipo|total_sobrante)$/i.test(key))
    for (const [, value] of importes) {
      const valor = numero(value)
      if (valor !== null) return Math.abs(valor)
    }
    const anidados = Object.values(detalle).flatMap(value => Array.isArray(value) ? value : [value])
      .filter((value): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value))
      .map(buscar).filter((value): value is number => value !== null)
    return anidados.length ? anidados.reduce((sum, value) => sum + value, 0) : null
  }
  return buscar(anomalia.detalle ?? {})
}
