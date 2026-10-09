import { apiClient } from './client'
import { API_CONFIG, API_ORIGIN } from '@/config/api'

export type EstadoTransferencia = 'PENDIENTE' | 'APROBADA' | 'RECHAZADA' | 'ANULADA' | 'EN_USO' | 'USADA'
export interface ConfirmacionTransferencia {
  id: number
  rowid_tercero: number
  nit: string
  razon_social: string
  id_co: string | null
  valor: number
  fecha_transferencia: string
  id_cta_bancaria: string
  referencia: string | null
  observacion: string | null
  estado: EstadoTransferencia
  created_by_usuario: string
  created_at: string
  revisado_by_usuario: string | null
  revisado_at: string | null
  motivo_rechazo: string | null
  rc_numero: string | null
  usado_at: string | null
  cant_soportes: number
  cant_facturas: number
}
export interface FacturaConfirmacion { rowid_sa: number; documento: string; saldo: number }
export interface SoporteConfirmacion { id: number; url: string; nombre_original: string; mime: string; tamano: number; created_at: string }
export interface DetalleConfirmacion extends ConfirmacionTransferencia { facturas: FacturaConfirmacion[]; soportes: SoporteConfirmacion[] }
export interface DuplicadoConfirmacion { id: number; razon_social: string; valor: number; fecha_transferencia: string; estado: EstadoTransferencia; referencia: string | null }
export interface CrearConfirmacion {
  rowid_tercero: number; nit: string; razon_social: string; id_co: string; valor: number; fecha_transferencia: string
  id_cta_bancaria: string; referencia: string; observacion: string; facturas: FacturaConfirmacion[]; soportes: File[]
}
const base = '/transferencias-confirmacion'
const multipart = { headers: { 'Content-Type': 'multipart/form-data' } }
export const soporteUrl = (url: string) => new URL(url, new URL(API_CONFIG.BASE_URL, API_ORIGIN).origin).href

export const transferenciasConfirmacionApi = {
  listar: async (params: { estado: EstadoTransferencia | 'TODAS'; desde?: string; hasta?: string; search?: string; page: number; pageSize: number }) =>
    (await apiClient.get<{ success: boolean; data: ConfirmacionTransferencia[]; pagination: { page: number; pageSize: number; total: number; totalPages: number } }>(base, { params })).data,
  resumen: async () => (await apiClient.get<{ data: Partial<Record<EstadoTransferencia, number>> }>(`${base}/resumen`)).data.data,
  disponibles: async (rowid_tercero: number) => (await apiClient.get<{ data: ConfirmacionTransferencia[] }>(`${base}/disponibles`, { params: { rowid_tercero } })).data.data,
  detalle: async (id: number) => (await apiClient.get<{ data: DetalleConfirmacion }>(`${base}/${id}`)).data.data,
  crear: async (body: CrearConfirmacion) => {
    const form = new FormData()
    for (const [key, value] of Object.entries(body)) {
      if (key === 'soportes') (value as File[]).forEach(file => form.append('soportes', file))
      else form.append(key, key === 'facturas' ? JSON.stringify(value) : String(value))
    }
    return (await apiClient.post<{ data: ConfirmacionTransferencia & { posibles_duplicados: DuplicadoConfirmacion[] } }>(base, form, multipart)).data.data
  },
  agregarSoportes: async (id: number, files: File[]) => {
    const form = new FormData(); files.forEach(file => form.append('soportes', file))
    return (await apiClient.post(`${base}/${id}/soportes`, form, multipart)).data
  },
  aprobar: async (id: number, valor: number) => (await apiClient.patch(`${base}/${id}/aprobar`, { valor })).data,
  rechazar: async (id: number, motivo: string) => (await apiClient.patch(`${base}/${id}/rechazar`, { motivo })).data,
  anular: async (id: number) => (await apiClient.patch(`${base}/${id}/anular`)).data,
}
