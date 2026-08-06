import { apiClient } from './client'

/** Relación entre una cuenta contable y una placa asignada a un conductor. */
export interface InterfazContableVehiculo {
    id: number
    usuario_id: number
    usuario: string
    nombre_completo: string | null
    maquinaria_cod: number
    placa: string | null
    categoria: string | null
    /** true si esa placa es la que el conductor está usando actualmente */
    en_uso: boolean | null
    cuenta_contable: string
    observaciones: string | null
    estado: boolean
    created_at?: string
    updated_at?: string | null
}

export interface ListarInterfazContableResponse {
    success: boolean
    data: InterfazContableVehiculo[]
    total: number
}

/** Body para crear/actualizar. La cuenta viaja como string de dígitos. */
export interface GuardarInterfazContableDto {
    usuario_id: number
    maquinaria_cod: number
    cuenta_contable: string
    observaciones?: string | null
    estado?: boolean
}

const BASE = '/maestros/interfaz-contable-vehiculos'

export const interfazContableApi = {
    listar: async (search?: string, usuarioId?: number): Promise<ListarInterfazContableResponse> => {
        const params: Record<string, string | number> = {}
        if (search?.trim()) params.search = search.trim()
        if (usuarioId != null) params.usuario_id = usuarioId

        const response = await apiClient.get(BASE, { params })
        const raw = response.data
        const data: InterfazContableVehiculo[] = Array.isArray(raw) ? raw : (raw?.data ?? [])
        return { success: true, data, total: raw?.total ?? data.length }
    },

    obtener: async (id: number): Promise<{ success: boolean; data: InterfazContableVehiculo }> => {
        const response = await apiClient.get(`${BASE}/${id}`)
        return response.data
    },

    crear: async (data: GuardarInterfazContableDto) => {
        const response = await apiClient.post(BASE, data)
        return response.data
    },

    actualizar: async (id: number, data: Partial<GuardarInterfazContableDto>) => {
        const response = await apiClient.put(`${BASE}/${id}`, data)
        return response.data
    },

    eliminar: async (id: number) => {
        const response = await apiClient.delete(`${BASE}/${id}`)
        return response.data
    },
}
