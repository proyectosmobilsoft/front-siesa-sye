import type { ConfirmacionTransferencia, PayloadRcResumido } from '@/api/transferenciasConfirmacion'
import { formatters } from '@/utils/formatters'

export const resumenPayload = (row: ConfirmacionTransferencia): PayloadRcResumido | null => row.payload_resumido ?? row.payload ?? null

export function facturaTexto(factura: NonNullable<PayloadRcResumido['facturas']>[number]) {
  if (typeof factura === 'string') return factura
  return factura.documento || [factura.prefijo, factura.numero].filter(Boolean).join('-') || 'Factura'
}

export function medioTexto(medio: NonNullable<PayloadRcResumido['medios']>[number]) {
  if (typeof medio === 'string') return medio
  return [medio.nombre || medio.medio || medio.descripcion || 'Medio', medio.valor != null ? formatters.currency(Number(medio.valor)) : ''].filter(Boolean).join(' · ')
}
