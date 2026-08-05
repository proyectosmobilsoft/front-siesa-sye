import { apiClient } from './client'

/**
 * Equipo del maestro de Maquinaria (BD Vehiman, solo lectura).
 * Los nombres de campo respetan los alias que devuelve la consulta original.
 */
export interface Maquinaria {
    Cod_Equipo: number
    COD_CATEGORIA: number | null
    CATEGORIA: string
    Nombre_Marca: string | null
    POTENCIA: string
    SERIE: string
    REFERENCIA: string | null
    PLACA: string
    COD_ESTADO: number | null
    ESTADO: string | null
    MODELO: string | null
    ANIO_FABRICACION: number | null
    COLOR: string
    CAPACIDAD: string | null
    Espejos: string | null
    TipoTorre: string | null
    AlturaMax: string | null
    Horquilla: string | null
    MarcaMotor: number | null
    ModeloMotor: string | null
    TipoMotor: string | null
    NumeroMotor: string | null
}

export interface ListarMaquinariaResponse {
    success: boolean
    data: Maquinaria[]
    total: number
    pagination: {
        page: number
        pageSize: number
        total: number
        totalPages: number
    }
}

export const maquinariaApi = {
    listar: async (search?: string, page = 1, pageSize = 100): Promise<ListarMaquinariaResponse> => {
        const params: Record<string, string | number> = { page, pageSize }
        if (search?.trim()) params.search = search.trim()

        const response = await apiClient.get('/maestros/maquinaria', { params })
        const raw = response.data
        const data: Maquinaria[] = Array.isArray(raw) ? raw : (raw?.data ?? [])

        return {
            success: true,
            data,
            total: raw?.total ?? data.length,
            pagination: raw?.pagination ?? { page, pageSize, total: data.length, totalPages: 1 },
        }
    },
}
