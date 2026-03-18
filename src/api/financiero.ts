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

/** Condición de pago (maestro) */
export interface CondicionPago {
    id: number
    code: string
    name: string
    status: number | boolean
    detalles?: ConfigDescuento[]
}

/** Respuesta listar condiciones de pago */
export interface ListarCondicionesPagoResponse {
    success: boolean
    data: CondicionPago[]
}

/** Body crear condición de pago */
export interface CrearCondicionPagoDto {
    code: string
    name: string
    status: number
    detalles?: {
        porcentaje_descuento: number
        dias_limite: number
        mostrar_aviso: boolean
        activo: boolean
        descripcion: string | null
        name: string
    }[]
}

/** Body actualizar condición de pago */
export interface ActualizarCondicionPagoDto {
    code?: string
    name?: string
    status?: number
    detalles?: ConfigDescuento[]
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
        const params = includeDetalles ? { include: 'detalles' } : {}
        const response = await apiClient.get('/financiero/condiciones-pago', { params })
        return response.data
    },

    obtenerCondicionPago: async (id: number): Promise<{ success: boolean; data: CondicionPago }> => {
        const response = await apiClient.get(`/financiero/condiciones-pago/${id}`)
        return response.data
    },

    crearCondicionPago: async (data: CrearCondicionPagoDto) => {
        const response = await apiClient.post('/financiero/condiciones-pago', data)
        return response.data
    },

    actualizarCondicionPago: async (id: number, data: ActualizarCondicionPagoDto) => {
        const response = await apiClient.put(`/financiero/condiciones-pago/${id}`, data)
        return response.data
    },

    eliminarCondicionPago: async (id: number) => {
        const response = await apiClient.delete(`/financiero/condiciones-pago/${id}`)
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
