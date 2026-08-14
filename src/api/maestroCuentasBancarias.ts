import { apiClient } from './client'

/** Fila de la whitelist enriquecida con la data real de SIESA (join hecho en el backend) */
export interface CuentaBancariaConfig {
    id: number
    activa: boolean | number
    fecha_creacion?: string
    creado_por?: string | null
    f026_id_cia: number
    f026_id: string
    f026_descripcion: string
    f026_id_banco?: string
    f026_nro_cuenta?: string
}

export interface CuentaBancariaConfigDto {
    id_cia: number
    id_cuenta: string
}

/** Fila real de t026_mm_cuentas_bancarias (SIESA), campos relevantes para el selector/tabla */
export interface CuentaBancariaSiesa {
    f026_id_cia: number
    f026_id: string
    f026_descripcion: string
    f026_id_banco: string
    f026_nro_cuenta: string
}

export interface CuentaBancariaSiesaResponse {
    success: boolean
    total: number
    data: CuentaBancariaSiesa[]
}

export const maestroCuentasBancariasApi = {
    /** Público, sin JWT. Trae las cuentas reales de SIESA filtradas por la whitelist. */
    listarCatalogo: async (): Promise<CuentaBancariaSiesa[]> => {
        const response = await apiClient.get<{ success: boolean; data: CuentaBancariaSiesa[] }>('/maestros/cuentas-bancarias')
        return response.data.data ?? []
    },

    /** Admin, con JWT. Catálogo completo de SIESA sin filtrar, excluye las ya parametrizadas — para el select del modal. */
    listarCatalogoSiesa: async (): Promise<CuentaBancariaSiesa[]> => {
        const response = await apiClient.get<CuentaBancariaSiesaResponse>('/maestros/cuentas-bancarias-config/catalogo-siesa')
        return response.data.data ?? []
    },

    listarConfig: async (soloActivas = true): Promise<{ success: boolean; data: CuentaBancariaConfig[] }> => {
        const response = await apiClient.get('/maestros/cuentas-bancarias-config', { params: { activas: soloActivas } })
        return response.data
    },

    crearConfig: async (data: CuentaBancariaConfigDto) => {
        const response = await apiClient.post('/maestros/cuentas-bancarias-config', data)
        return response.data
    },

    actualizarConfig: async (id: number, data: CuentaBancariaConfigDto) => {
        const response = await apiClient.put(`/maestros/cuentas-bancarias-config/${id}`, data)
        return response.data
    },

    eliminarConfig: async (id: number) => {
        const response = await apiClient.delete(`/maestros/cuentas-bancarias-config/${id}`)
        return response.data
    },

    reactivarConfig: async (id: number) => {
        const response = await apiClient.patch(`/maestros/cuentas-bancarias-config/${id}/reactivar`)
        return response.data
    },
}
