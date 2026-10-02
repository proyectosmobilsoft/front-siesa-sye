import { apiClient } from './client'

export type EstadoAsignacion = 'ASIGNADA' | 'COBRADA' | 'CANCELADA'
export type EstadoFacturaAsignada = 'PENDIENTE' | 'COBRADA' | 'CANCELADA'

export interface FacturaAsignada {
    id: number
    asignacion_id: number
    rowid_factura: number
    numero_factura: number | null
    prefijo_docto?: string
    valor: number
    /** Peso (kg) de la factura: cantidad facturada × peso del ítem en SIESA. */
    peso_kg?: number
    estado: EstadoFacturaAsignada
    rc_rowid: number | null
    fecha_cobro: string | null
}

export interface AsignacionCobro {
    id: number
    id_co: string
    rowid_tercero: number
    cliente_nombre?: string
    conductor_id: number
    conductor_nombre?: string
    usuario_asigno: string
    estado: EstadoAsignacion
    observacion: string | null
    created_at: string
    updated_at: string
    facturas: FacturaAsignada[]
}

export interface TableroConductorRow {
    conductor_id: number
    conductor_nombre?: string
    total_facturas: number
    pendientes: number
    cobradas: number
    canceladas: number
    valor_pendiente: number
    valor_cobrado: number
    /** Carga (kg) de las facturas pendientes, solo mercancía. */
    kg_pendiente?: number
    /** Pendientes ya vencidas en SIESA. */
    vencidas?: number
    /** Días desde la asignación de la pendiente más vieja. */
    mas_antigua_dias?: number
    /** Saldo real en SIESA de las pendientes (puede ser menor si hubo abonos). */
    saldo_pendiente?: number
    clientes_pendientes?: number
    ultima_asignacion?: string
    centro_operacion?: string | null
    /** cobradas / (cobradas + pendientes); null si no hay ninguna. */
    cumplimiento?: number | null
}

export interface CrearAsignacionDto {
    id_co: string
    rowid_tercero: number
    conductor_id: number
    observacion?: string
    facturas: Array<{ rowid_factura: number; numero_factura?: number; prefijo_docto?: string; valor: number }>
}

export const asignacionCobroApi = {
    crear: async (data: CrearAsignacionDto): Promise<AsignacionCobro> => {
        const response = await apiClient.post<{ success: boolean; data: AsignacionCobro }>('/asignacion-cobro', data)
        return response.data.data
    },

    cancelarAsignacion: async (id: number): Promise<AsignacionCobro> => {
        const response = await apiClient.delete<{ success: boolean; data: AsignacionCobro }>(`/asignacion-cobro/${id}`)
        return response.data.data
    },

    cancelarFactura: async (facturaId: number): Promise<AsignacionCobro> => {
        const response = await apiClient.delete<{ success: boolean; data: AsignacionCobro }>(`/asignacion-cobro/factura/${facturaId}`)
        return response.data.data
    },

    porConductor: async (conductorId: number, estado?: EstadoAsignacion): Promise<AsignacionCobro[]> => {
        const response = await apiClient.get<{ success: boolean; data: AsignacionCobro[] }>(
            `/asignacion-cobro/conductor/${conductorId}`,
            { params: estado ? { estado } : undefined }
        )
        return response.data.data
    },

    tablero: async (): Promise<TableroConductorRow[]> => {
        const response = await apiClient.get<{ success: boolean; data: TableroConductorRow[] }>('/asignacion-cobro/tablero')
        return response.data.data
    },

    /** Todas las facturas PENDIENTE de cualquier cliente/conductor, para no ofrecerlas de nuevo al armar un lote. */
    facturasYaAsignadas: async (): Promise<Array<{ rowid_factura: number; conductor_id: number; conductor_nombre?: string }>> => {
        const response = await apiClient.get<{ success: boolean; data: Array<{ rowid_factura: number; conductor_id: number; conductor_nombre?: string }> }>(
            '/asignacion-cobro/facturas-asignadas'
        )
        return response.data.data
    },

    /** Verifica las facturas PENDIENTE/COBRADA contra SIESA (requiere VPN) y cancela localmente las anuladas. */
    reconciliar: async (): Promise<{ verificadas: number; canceladas: number }> => {
        const response = await apiClient.post<{ success: boolean; data: { verificadas: number; canceladas: number } }>('/asignacion-cobro/reconciliar')
        return response.data.data
    },
}
