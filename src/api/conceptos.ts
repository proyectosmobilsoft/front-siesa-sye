import { apiClient } from './client'

/** Concepto del maestro "Relación de Conceptos" (tabla conceptos, BD2) */
export interface Concepto {
    id: number
    nombre: string
    descripcion?: string | null
    estado: boolean
    created_at?: string
    updated_at?: string | null
}

export interface ListarConceptosResponse {
    success: boolean
    data: Concepto[]
    total: number
}

/** Body crear concepto */
export interface CrearConceptoDto {
    nombre: string
    descripcion?: string | null
    estado: boolean
}

/** Body actualizar concepto */
export type ActualizarConceptoDto = CrearConceptoDto

export const conceptosApi = {
    listar: async (search?: string, estado?: boolean): Promise<ListarConceptosResponse> => {
        const params: Record<string, string | number> = {}
        if (search?.trim()) params.search = search.trim()
        if (estado !== undefined) params.estado = estado ? 1 : 0

        const response = await apiClient.get('/maestros/conceptos', { params })

        // El backend responde { success, data, total }; se normaliza por si
        // algún proxy devuelve el array pelado (mismo criterio que financiero.ts).
        const raw = response.data
        const data: Concepto[] = Array.isArray(raw) ? raw : (raw?.data ?? [])

        return { success: true, data, total: raw?.total ?? data.length }
    },

    obtener: async (id: number): Promise<{ success: boolean; data: Concepto }> => {
        const response = await apiClient.get(`/maestros/conceptos/${id}`)
        return response.data
    },

    crear: async (data: CrearConceptoDto) => {
        const response = await apiClient.post('/maestros/conceptos', data)
        return response.data
    },

    actualizar: async (id: number, data: ActualizarConceptoDto) => {
        const response = await apiClient.put(`/maestros/conceptos/${id}`, data)
        return response.data
    },

    eliminar: async (id: number) => {
        const response = await apiClient.delete(`/maestros/conceptos/${id}`)
        return response.data
    },
}
