import { apiClient } from './client'

export interface UsuarioMaster {
    id: number
    usuario: string
    email: string | null
    telefono: string | null
    nombre_completo: string | null
    activo: boolean
    intentos_fallidos: number
    bloqueado_hasta: string | null
    created_at: string
    updated_at: string
    ultimo_acceso: string | null
}

export interface ListarUsuariosResponse {
    success: boolean
    data: UsuarioMaster[]
    total: number
    pagination: {
        page: number
        pageSize: number
        total: number
        totalPages: number
    }
}

export interface CreateUsuarioMasterDto {
    usuario: string
    pin: string
    email?: string | null
    telefono?: string | null
    nombre_completo?: string | null
    observaciones?: string | null
    activo: boolean
}

export const seguridadApi = {
    listarUsuarios: async (page = 1, pageSize = 100, search = ''): Promise<ListarUsuariosResponse> => {
        const params: Record<string, any> = { page, pageSize }
        if (search.trim()) params.search = search.trim()
        const response = await apiClient.get('/auth-secundario/usuarios', { params })
        return response.data
    },

    crearUsuario: async (data: CreateUsuarioMasterDto) => {
        const response = await apiClient.post('/auth-secundario/usuarios', data)
        return response.data
    },
}
