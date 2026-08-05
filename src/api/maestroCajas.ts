import { apiClient } from './client'

export interface Caja {
    id: number
    nombre: string
    id_co: string
    auxiliar_contable: string
    activa: boolean | number
    fecha_creacion?: string
    creado_por?: string | null
}

export interface CajaDto {
    nombre: string
    id_co: string
    auxiliar_contable: string
}

export const maestroCajasApi = {
    listarCajas: async (soloActivas = true): Promise<{ success: boolean; data: Caja[] }> => {
        const response = await apiClient.get('/maestros/cajas', { params: { activas: soloActivas } })
        return response.data
    },

    crearCaja: async (data: CajaDto) => {
        const response = await apiClient.post('/maestros/cajas', data)
        return response.data
    },

    actualizarCaja: async (id: number, data: CajaDto) => {
        const response = await apiClient.put(`/maestros/cajas/${id}`, data)
        return response.data
    },

    eliminarCaja: async (id: number) => {
        const response = await apiClient.delete(`/maestros/cajas/${id}`)
        return response.data
    },

    reactivarCaja: async (id: number, nombre?: string) => {
        const response = await apiClient.patch(`/maestros/cajas/${id}/reactivar`, nombre ? { nombre } : {})
        return response.data
    },
}
