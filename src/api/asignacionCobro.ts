import { apiClient } from './client'

export type EstadoAsignacion = 'ASIGNADA' | 'COBRADA' | 'CANCELADA'
export type EstadoFacturaAsignada = 'PENDIENTE' | 'COBRADA' | 'CANCELADA' | 'ENTREGADA'

export interface FacturaAsignada {
    id: number
    asignacion_id: number
    rowid_factura: number
    numero_factura: number | null
    prefijo_docto?: string
    valor: number
    /** Peso (kg) de la factura: cantidad facturada × peso del ítem en SIESA. */
    peso_kg?: number
    /** Condición de pago de la factura en SIESA (ej. CRC = CONTRAENTREGA). */
    condicion_pago_id?: string | null
    condicion_pago?: string | null
    estado: EstadoFacturaAsignada
    rc_rowid: number | null
    fecha_cobro: string | null
    entrega?: 'ASIGNADA' | 'NO_ENTREGADA' | 'ENTREGA_PARCIAL' | 'ENTREGADA'
    entrega_nota?: string | null
    entrega_at?: string | null
}

export interface AsignacionCobro {
    id: number
    id_co: string
    rowid_tercero: number
    cliente_nombre?: string
    cliente_nit?: string
    conductor_id: number
    conductor_nombre?: string
    usuario_asigno: string
    estado: EstadoAsignacion
    observacion: string | null
    created_at: string
    updated_at: string
    facturas: FacturaAsignada[]
}

/** Factura a crédito entregada por el conductor SIN recibo de caja: sale del tablero, cartera la cobra después. */
export interface EntregadaSinRc {
    id: number
    asignacion_id: number
    entrega_id: number | null
    rowid_factura: number
    numero_factura: number | null
    prefijo_docto: string | null
    valor: number
    /** Saldo vigente en SIESA (null si no se pudo consultar). */
    saldo: number | null
    /** true si ya se pagó (saldo <= 0). */
    pagada: boolean | null
    id_co: string
    rowid_tercero: number
    cliente_nombre: string | null
    cliente_nit: string | null
    conductor_id: number
    conductor_nombre: string | null
    /** Usuario de SIESA del conductor (el mismo `usuario_creacion` de sus RC). */
    usuario_siesa: string | null
    receptor_nombre: string | null
    nota: string | null
    entrega_at: string
    /** ids de las fotos de la entrega (se piden con fotoEntrega). */
    fotos: number[]
}

export interface TableroConductorRow {
    entregadas?: number
    valor_entregado?: number
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
    /** Pendientes cuya condición de pago en SIESA no es contraentrega (se cierran como entregadas, sin RC). */
    a_credito?: number
    /** Pendientes cuya condición de pago en SIESA es contraentrega (requieren RC al entregar). */
    contraentrega?: number
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
    crear: async (data: CrearAsignacionDto, silenciarAviso = false): Promise<AsignacionCobro> => {
        const response = await apiClient.post<{ success: boolean; data: AsignacionCobro }>('/asignacion-cobro', data, { silenciarAviso })
        return response.data.data
    },

    cancelarAsignacion: async (id: number): Promise<AsignacionCobro> => {
        const response = await apiClient.delete<{ success: boolean; data: AsignacionCobro }>(`/asignacion-cobro/${id}`)
        return response.data.data
    },

    cancelarFactura: async (facturaId: number, silenciarAviso = false): Promise<AsignacionCobro> => {
        const response = await apiClient.delete<{ success: boolean; data: AsignacionCobro }>(`/asignacion-cobro/factura/${facturaId}`, { silenciarAviso })
        return response.data.data
    },

    porConductor: async (
        conductorId: number,
        estado?: EstadoAsignacion,
        rango?: { desde?: string; hasta?: string }
    ): Promise<AsignacionCobro[]> => {
        const params: Record<string, string> = {}
        if (estado) params.estado = estado
        if (rango?.desde) params.desde = rango.desde
        if (rango?.hasta) params.hasta = rango.hasta
        const response = await apiClient.get<{ success: boolean; data: AsignacionCobro[] }>(
            `/asignacion-cobro/conductor/${conductorId}`,
            { params: Object.keys(params).length ? params : undefined }
        )
        return response.data.data
    },

    /** Sin fechas: últimos 30 días. Las fechas (YYYY-MM-DD) son días de Colombia, ambas inclusivas. */
    tablero: async (rango?: { desde?: string; hasta?: string }): Promise<TableroConductorRow[]> => {
        const response = await apiClient.get<{ success: boolean; data: TableroConductorRow[] }>('/asignacion-cobro/tablero', {
            params: { desde: rango?.desde || undefined, hasta: rango?.hasta || undefined },
        })
        return response.data.data
    },

    /** Facturas a crédito entregadas sin RC. Sin fechas: últimos 30 días (días de Colombia, inclusivas). */
    entregadasSinRc: async (rango?: { desde?: string; hasta?: string; conductorId?: number }): Promise<EntregadaSinRc[]> => {
        const response = await apiClient.get<{ success: boolean; data: EntregadaSinRc[] }>('/asignacion-cobro/entregadas-sin-rc', {
            params: { desde: rango?.desde || undefined, hasta: rango?.hasta || undefined, conductorId: rango?.conductorId || undefined },
        })
        return response.data.data
    },

    /** Foto de una entrega como URL local (la API pide sesión, no se puede usar como <img src> directo). Liberar con URL.revokeObjectURL. */
    fotoEntrega: async (fotoId: number): Promise<string> => {
        const response = await apiClient.get<Blob>(`/asignacion-cobro/entregas/fotos/${fotoId}/archivo`, { responseType: 'blob' })
        return URL.createObjectURL(response.data)
    },

    /** Todas las facturas PENDIENTE de cualquier cliente/conductor, para no ofrecerlas de nuevo al armar un lote. */
    facturasYaAsignadas: async (): Promise<Array<{ rowid_factura: number; conductor_id: number; conductor_nombre?: string; asignada_at?: string }>> => {
        const response = await apiClient.get<{ success: boolean; data: Array<{ rowid_factura: number; conductor_id: number; conductor_nombre?: string; asignada_at?: string }> }>(
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
