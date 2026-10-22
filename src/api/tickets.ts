import { apiClient } from './client'

export type CategoriaTicket = 'mejora' | 'soporte' | 'otro'
export type PrioridadTicket = 'baja' | 'media' | 'alta' | 'critica'
export type EstadoTicket = 'pendiente' | 'aprobado' | 'rechazado' | 'en_revision' | 'solucionado'
export type PipelineTicket = 'sin_tomar' | 'tomado' | 'en_progreso' | 'listo' | 'cerrado'
export type TipoTrabajo = 'soporte' | 'adicional' | 'otro'
export type RazonRechazo = 'duplicado' | 'no_es_error' | 'informacion_insuficiente' | 'no_aplica' | 'otro'
export type VistaTickets = 'pendientes' | 'aceptados' | 'cerrados' | 'rechazados'

export interface CapturaTicket { id: number; url: string; nombre_original?: string; mime?: string }
export interface Ticket {
  id: number; categoria: CategoriaTicket; titulo: string; descripcion: string; estado: EstadoTicket
  prioridad: PrioridadTicket; origen: 'manual' | 'automatico'; ruta: string | null; contexto: Record<string, unknown> | string | null
  reportado_por_id: number; reportado_por_nombre: string; tipo_trabajo: TipoTrabajo | null
  pipeline_estado: PipelineTicket; tomado_por_nombre: string | null; tomado_at: string | null
  aprobado_at: string | null; rechazado_at: string | null; razon_rechazo: RazonRechazo | null
  motivo_rechazo: string | null; notas: string | null; solucionado_at: string | null
  solucionado_por_nombre: string | null; created_at: string; updated_at: string; capturas: CapturaTicket[]
}
export interface ResumenTickets { pendientes: number; aceptados: number; cerrados: number; rechazados: number; pipeline: Partial<Record<PipelineTicket, number>> }
export interface ListarTicketsParams { vista: VistaTickets; desde?: string; hasta?: string; search?: string; page: number; pageSize: number }
export interface PaginaTickets { success: boolean; data: Ticket[]; pagination: { page: number; pageSize: number; total: number; totalPages: number } }
export interface CrearTicket { categoria: CategoriaTicket; titulo: string; descripcion: string; prioridad: PrioridadTicket; ruta: string; contexto: Record<string, unknown>; capturas: File[] }

const base = '/tickets'
export const ticketsApi = {
  crear: async (input: CrearTicket) => {
    const form = new FormData()
    form.append('categoria', input.categoria)
    form.append('titulo', input.titulo.trim())
    form.append('descripcion', input.descripcion.trim())
    form.append('prioridad', input.prioridad)
    form.append('origen', 'manual')
    form.append('ruta', input.ruta)
    form.append('contexto', JSON.stringify(input.contexto))
    input.capturas.forEach(file => form.append('capturas', file))
    return (await apiClient.post<{ success: boolean; data: Ticket }>(base, form, { headers: { 'Content-Type': 'multipart/form-data' } })).data.data
  },
  mis: async () => (await apiClient.get<{ data: Ticket[] }>(`${base}/mis`)).data.data,
  listar: async (params: ListarTicketsParams) => (await apiClient.get<PaginaTickets>(base, { params })).data,
  resumen: async () => (await apiClient.get<{ data: ResumenTickets }>(`${base}/resumen`)).data.data,
  detalle: async (id: number) => (await apiClient.get<{ data: Ticket }>(`${base}/${id}`)).data.data,
  aprobar: async (id: number) => (await apiClient.patch(`${base}/${id}/aprobar`)).data,
  rechazar: async (id: number, razon: RazonRechazo, motivo: string) => (await apiClient.patch(`${base}/${id}/rechazar`, { razon, motivo })).data,
  tomar: async (id: number, tipo_trabajo: TipoTrabajo) => (await apiClient.patch(`${base}/${id}/tomar`, { tipo_trabajo })).data,
  mover: async (id: number, pipeline_estado: PipelineTicket) => (await apiClient.patch(`${base}/${id}/mover`, { pipeline_estado })).data,
  capturaBlob: async (url: string) => (await apiClient.get<Blob>(url.replace(/^\/api(?=\/)/, ''), { responseType: 'blob' })).data,
}
