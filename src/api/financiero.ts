import { apiClient } from './client'

/** Configuración de descuento financiero (detalle de condición de pago) */
export interface ConfigDescuento {
    id?: number
    condicion_pago_id?: number
    porcentaje_descuento: number
    dias_limite: number
    mostrar_aviso: boolean
    activo: boolean
    descripcion: string | null
    name: string
}

/** Estructura que viene del backend (nueva API maestros) */
export interface CondicionPagoBackend {
    codigo: string
    descripcion: string
    dias_vcto: number
    dias_pronto_pago: number
    tasa_descto_pp: number
    tasa_mora: number
    monto_min_mora: number
    numero_cuotas: number
    ind_estado: number
    ind_credito: number
    id_medio_pago: string | null
    id_grupo: string | null
}

/** Condición de pago (maestro) - Adaptada para el frontend */
export interface CondicionPago {
    code: string
    name: string
    status: number | boolean
    descripcion?: string
    dias_vcto?: number
    dias_pronto_pago?: number
    tasa_descto_pp?: number
    tasa_mora?: number
    monto_min_mora?: number
    numero_cuotas?: number
    ind_credito?: number
    id_medio_pago?: string | null
    id_grupo?: string | null
    detalles?: ConfigDescuento[]
}

/** Respuesta listar condiciones de pago */
export interface ListarCondicionesPagoResponse {
    success: boolean
    data: CondicionPago[]
}

/** Adaptador: convierte del formato backend al formato frontend */
const adaptarCondicionPago = (backend: CondicionPagoBackend): CondicionPago => {
    return {
        code: backend.codigo,
        name: backend.descripcion,
        descripcion: backend.descripcion,
        status: backend.ind_estado,
        dias_vcto: backend.dias_vcto,
        dias_pronto_pago: backend.dias_pronto_pago,
        tasa_descto_pp: backend.tasa_descto_pp,
        tasa_mora: backend.tasa_mora,
        monto_min_mora: backend.monto_min_mora,
        numero_cuotas: backend.numero_cuotas,
        ind_credito: backend.ind_credito,
        id_medio_pago: backend.id_medio_pago,
        id_grupo: backend.id_grupo,
    }
}

/** Body crear condición de pago (formato backend) */
export interface CrearCondicionPagoDto {
    cia: number
    codigo: string
    descripcion: string
    dias_vcto: number
    dias_pronto_pago: number
    tasa_descto_pp: number
    tasa_mora: number
    monto_min_mora: number
    notas?: string | null
    numero_cuotas: number
    modo_periodicidad: number
    ind_estado: number
}

/** Body actualizar condición de pago (formato backend) */
export interface ActualizarCondicionPagoDto {
    cia: number
    descripcion?: string
    dias_vcto?: number
    dias_pronto_pago?: number
    tasa_descto_pp?: number
    tasa_mora?: number
    monto_min_mora?: number
    notas?: string | null
    numero_cuotas?: number
    ind_estado?: number
}

/** Body crear config descuento (sin condicion_pago_id si se usa ruta anidada) */
export interface CrearConfigDescuentoDto {
    condicion_pago_id?: number
    porcentaje_descuento: number
    dias_limite: number
    mostrar_aviso: boolean
    activo: boolean
    descripcion?: string | null
    name: string
}

export const financieroApi = {
    // --- Condiciones de pago
    listarCondicionesPago: async (includeDetalles = false): Promise<ListarCondicionesPagoResponse> => {
        const params: Record<string, string | number> = { cia: 1 }
        if (includeDetalles) {
            params.include = 'detalles'
        }
        const response = await apiClient.get('/maestros/condiciones-pago', { params })
        
        // Debug: ver la estructura exacta de la respuesta
        console.log('📦 Estructura de respuesta completa:', response)
        console.log('📦 response.data:', response.data)
        console.log('📦 Tipo de response.data:', typeof response.data, Array.isArray(response.data))
        
        // El backend puede devolver los datos en diferentes estructuras:
        // 1. Directamente como array: [...]
        // 2. Envuelto en objeto: { data: [...] }
        // 3. Envuelto en objeto con success: { success: true, data: [...] }
        let backendData: CondicionPagoBackend[] = []
        
        if (Array.isArray(response.data)) {
            // Caso 1: response.data es directamente el array
            backendData = response.data
        } else if (response.data?.data && Array.isArray(response.data.data)) {
            // Caso 2 y 3: response.data.data es el array
            backendData = response.data.data
        } else {
            console.error('Estructura de respuesta inesperada:', response.data)
            backendData = []
        }
        
        console.log('📦 backendData después de procesar:', backendData)
        
        // Adaptar la respuesta del backend al formato esperado por el frontend
        const adaptedData = backendData.map((item) => adaptarCondicionPago(item))
        
        return {
            success: true,
            data: adaptedData
        }
    },

    obtenerCondicionPago: async (code: string): Promise<{ success: boolean; data: CondicionPago }> => {
        const response = await apiClient.get(`/maestros/condiciones-pago/${code}`, { params: { cia: 1 } })
        return response.data
    },

    crearCondicionPago: async (data: CrearCondicionPagoDto) => {
        const response = await apiClient.post('/maestros/condiciones-pago', data)
        return response.data
    },

    actualizarCondicionPago: async (code: string, data: ActualizarCondicionPagoDto) => {
        const response = await apiClient.put(`/maestros/condiciones-pago/${code}`, data)
        return response.data
    },

    eliminarCondicionPago: async (code: string) => {
        const response = await apiClient.delete(`/maestros/condiciones-pago/${code}`, { params: { cia: 1 } })
        return response.data
    },

    // --- Config descuentos (por condición, anidado)
    listarConfigDescuentosPorCondicion: async (condicionId: number): Promise<{ success: boolean; data: ConfigDescuento[] }> => {
        const response = await apiClient.get(`/financiero/condiciones-pago/${condicionId}/config-descuentos`)
        return response.data
    },

    crearConfigDescuentoPorCondicion: async (
        condicionId: number,
        data: Omit<CrearConfigDescuentoDto, 'condicion_pago_id'>
    ) => {
        const response = await apiClient.post(
            `/financiero/condiciones-pago/${condicionId}/config-descuentos`,
            data
        )
        return response.data
    },

    actualizarConfigDescuentoPorCondicion: async (
        condicionId: number,
        configId: number,
        data: Partial<Omit<ConfigDescuento, 'id' | 'condicion_pago_id'>>
    ) => {
        const response = await apiClient.put(
            `/financiero/condiciones-pago/${condicionId}/config-descuentos/${configId}`,
            data
        )
        return response.data
    },

    eliminarConfigDescuentoPorCondicion: async (condicionId: number, configId: number) => {
        const response = await apiClient.delete(
            `/financiero/condiciones-pago/${condicionId}/config-descuentos/${configId}`
        )
        return response.data
    },

    // --- Config descuentos (globales, opcional)
    listarConfigDescuentos: async (condicionPagoId?: number): Promise<{ success: boolean; data: ConfigDescuento[] }> => {
        const params = condicionPagoId != null ? { condicion_pago_id: condicionPagoId } : {}
        const response = await apiClient.get('/financiero/config-descuentos', { params })
        return response.data
    },

    crearConfigDescuento: async (data: CrearConfigDescuentoDto) => {
        const response = await apiClient.post('/financiero/config-descuentos', data)
        return response.data
    },

    obtenerConfigDescuento: async (id: number) => {
        const response = await apiClient.get(`/financiero/config-descuentos/${id}`)
        return response.data
    },

    actualizarConfigDescuento: async (id: number, data: Partial<CrearConfigDescuentoDto>) => {
        const response = await apiClient.put(`/financiero/config-descuentos/${id}`, data)
        return response.data
    },

    eliminarConfigDescuento: async (id: number) => {
        const response = await apiClient.delete(`/financiero/config-descuentos/${id}`)
        return response.data
    },
}
