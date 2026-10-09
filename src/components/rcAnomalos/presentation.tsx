import { formatters } from '@/utils/formatters'
import type { CodigoAnomalia, SeveridadAnomalia } from '@/api/rcAnomalias'

export const ayudaAnomalias: Record<CodigoAnomalia, string> = {
  DESCUADRE: 'Débitos y créditos no cuadran. Revisa los importes y el ajuste contable.',
  CABECERA_LINEAS: 'El total de la cabecera difiere de las líneas. Compara ambos valores.',
  AJUSTE_LADO: 'El ajuste está en el lado contable incorrecto. Revisa débito y crédito.',
  AJUSTE_LIMITE: 'El ajuste supera el límite permitido. Revisa su cálculo y parametrización.',
  ANTICIPO_SIN_SA: 'Hay un anticipo sin saldo abierto asociado. Verifica el documento SA.',
  SOBRANTE_SIN_ANTICIPO: 'El sobrante no tiene anticipo correspondiente. Revisa su aplicación.',
  ANTICIPO_SUCURSAL: 'El anticipo no corresponde a la sucursal del recibo. Comprueba la sucursal.',
  DESCUENTO_DISTINTO: 'El descuento aplicado difiere del esperado. Revisa factura, condición, días y porcentaje.',
  MEDIOS_TOTAL: 'Los medios de pago no suman el total del recibo. Comprueba sus importes.',
  LINEAS_DUPLICADAS: 'Hay movimientos contables repetidos. Revisa cuenta, tercero e importes.',
  ANULADO_SIN_DOC: 'El recibo está anulado sin documento de anulación. Comprueba el soporte.',
}
export const severidadOrden: Record<SeveridadAnomalia, number> = { critica: 0, alta: 1, media: 2 }
export const severidadColor: Record<SeveridadAnomalia, string> = {
  critica: 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300',
  alta: 'border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300',
  media: 'border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300',
}
export const moneda = (value: unknown) => formatters.currency(Number(value) || 0)
export const etiqueta = (key: string) => key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
export const valorLegible = (value: unknown, key = ''): string => {
  if (value == null || value === '') return '—'
  if (typeof value === 'number') return /valor|monto|total|diferencia|debito|credito|^db\d?$|^cr\d?$|esperado|aplicado|anticipo/i.test(key) ? moneda(value) : formatters.number(value)
  if (typeof value === 'boolean') return value ? 'Sí' : 'No'
  if (Array.isArray(value)) return value.map(v => valorLegible(v)).join(', ')
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}
