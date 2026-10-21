import { apiClient } from './client'

export type EstadoTransferencia = 'PENDIENTE' | 'APROBADA' | 'RECHAZADA' | 'ANULADA' | 'EN_USO' | 'USADA'
export interface PayloadRcResumido {
  cliente?: string | { nombre?: string; razon_social?: string; nit?: string }
  valor?: number
  facturas?: Array<string | { numero?: string; prefijo?: string; documento?: string; valor?: number }>
  medios?: Array<string | { nombre?: string; medio?: string; descripcion?: string; valor?: number }>
}
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
  conductor_id?: number | null
  conductor_nombre?: string | null
  tiene_payload?: boolean
  payload?: PayloadRcResumido | null
  payload_resumido?: PayloadRcResumido | null
  rc_error?: string | null
  segundos_espera?: number | null
  rc_creado_at?: string | null
}
export interface FacturaConfirmacion { rowid_sa: number; documento: string; saldo: number }
export interface SoporteConfirmacion { id: number; url: string; nombre_original: string; mime: string; tamano: number; created_at: string }
export interface DetalleConfirmacion extends ConfirmacionTransferencia { facturas: FacturaConfirmacion[]; soportes: SoporteConfirmacion[] }
export interface DuplicadoConfirmacion { id: number; razon_social: string; valor: number; fecha_transferencia: string; estado: EstadoTransferencia; referencia: string | null }
export interface CrearConfirmacion {
  rowid_tercero: number; nit: string; razon_social: string; id_co: string; valor: number; fecha_transferencia: string
  id_cta_bancaria: string; referencia: string; observacion: string; facturas: FacturaConfirmacion[]; soportes: File[]
}
export interface ResumenTransferencias extends Partial<Record<EstadoTransferencia, number>> {
  rc_pendientes: number
  solicitudes_pendientes: number
  promedio_espera_seg: number | null
}
export interface PendienteAlarma { id: number; conductor_nombre: string | null; cliente: string; valor: number; created_at: string }
export interface PendientesAlarma { total: number; items: PendienteAlarma[] }
export interface ListarConfirmacionesParams { estado: EstadoTransferencia | 'TODAS'; tipo?: 'rc_pendiente'; desde?: string; hasta?: string; search?: string; page: number; pageSize: number }
export interface MiRcPendiente {
  id: number
  estado: EstadoTransferencia
  cliente: string
  valor: number
  facturas: Array<{ numero?: string; prefijo?: string }>
  motivo_rechazo: string | null
  rc_numero: string | null
  rc_error: string | null
  created_at: string
  revisado_at: string | null
  segundos_espera: number | null
  soportes: Array<{ url: string }>
}
const base = '/transferencias-confirmacion'
const multipart = { headers: { 'Content-Type': 'multipart/form-data' } }

export const transferenciasConfirmacionApi = {
  /** Descarga un soporte con la sesión (las fotos no son públicas). `url` es la que trae el soporte, p. ej. /api/transferencias-confirmacion/soportes/5/archivo */
  soporteBlob: async (url: string) => (await apiClient.get<Blob>(url.replace(/^\/api(?=\/)/, ''), { responseType: 'blob' })).data,
  listar: async (params: ListarConfirmacionesParams) =>
    (await apiClient.get<{ success: boolean; data: ConfirmacionTransferencia[]; pagination: { page: number; pageSize: number; total: number; totalPages: number } }>(base, { params })).data,
  resumen: async () => (await apiClient.get<{ data: ResumenTransferencias }>(`${base}/resumen`)).data.data,
  pendientesAlarma: async () => (await apiClient.get<{ success: boolean; data: PendientesAlarma }>(`${base}/pendientes-alarma`)).data.data,
  disponibles: async (rowid_tercero: number) => (await apiClient.get<{ data: ConfirmacionTransferencia[] }>(`${base}/disponibles`, { params: { rowid_tercero } })).data.data,
  misPendientes: async (estado?: EstadoTransferencia) => (await apiClient.get<{ data: MiRcPendiente[] }>(`${base}/mis-pendientes`, { params: estado ? { estado } : undefined })).data.data,
  detalle: async (id: number) => (await apiClient.get<{ data: DetalleConfirmacion }>(`${base}/${id}`)).data.data,
  crearRcPendiente: async (payload: Record<string, unknown>, soportes: File[]) => {
    const form = new FormData()
    soportes.forEach(file => form.append('soportes', file))
    form.append('payload', JSON.stringify(payload))
    return (await apiClient.post<{ success: boolean; data: { id: number; estado: 'PENDIENTE'; created_at: string } }>(`${base}/rc-pendiente`, form, multipart)).data.data
  },
  reenviar: async (id: number, soportes: File[]) => {
    const form = new FormData()
    soportes.forEach(file => form.append('soportes', file))
    return (await apiClient.patch(`${base}/${id}/reenviar`, form, multipart)).data
  },
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
  aprobar: async (id: number, valor?: number) => (await apiClient.patch<{ data?: ConfirmacionTransferencia }>(`${base}/${id}/aprobar`, valor == null ? undefined : { valor })).data,
  reintentarRc: async (id: number) => (await apiClient.patch<{ data?: ConfirmacionTransferencia }>(`${base}/${id}/reintentar-rc`)).data,
  rechazar: async (id: number, motivo: string) => (await apiClient.patch(`${base}/${id}/rechazar`, { motivo })).data,
  anular: async (id: number) => (await apiClient.patch(`${base}/${id}/anular`)).data,
}
