import { apiClient } from './client'

export interface Pais {
    id: number
    nombre: string
    name: string
    nom: string
    iso2: string
    iso3: string
    phone_code: string
}

export interface ListarPaisesResponse {
    success: boolean
    data: Pais[]
}

export const paisesApi = {
    /**
     * Obtener lista de países disponibles
     * @param search - Filtrar por nombre (es/en), iso2 o iso3
     * @param phone_code - Filtrar por código telefónico
     */
    listarPaises: async (params?: { search?: string; phone_code?: string }) => {
        const response = await apiClient.get<ListarPaisesResponse>('/paises', { params })
        return response.data
    },
}
