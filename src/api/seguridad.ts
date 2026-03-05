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
    rol_id: number
    pin?: string
    contraseña?: string
    email?: string | null
    telefono?: string | null
    nombre_completo?: string | null
    observaciones?: string | null
    activo: boolean
}

export interface AuthRole {
    id: number
    nombre: string
    pin: boolean // true si usa PIN, false si usa contraseña
    Estado: boolean // Estado del rol (activo/inactivo)
}

export interface ListarRolesResponse {
    success: boolean
    data: AuthRole[]
}

export const seguridadApi = {
    listarUsuarios: async (page = 1, pageSize = 100, search = ''): Promise<ListarUsuariosResponse> => {
        const params: Record<string, any> = { page, pageSize }
        if (search.trim()) params.search = search.trim()
        const response = await apiClient.get('/auth-secundario/usuarios', { params })
        return response.data
    },

    verificarUsuario: async (usuario: string): Promise<{ exists: boolean; data?: UsuarioMaster }> => {
        try {
            const response = await apiClient.get(`/auth-secundario/usuarios/${usuario}`)
            return { exists: true, data: response.data?.data || response.data }
        } catch (err: any) {
            if (err?.response?.status === 404) {
                return { exists: false }
            }
            throw err
        }
    },

    crearUsuario: async (data: CreateUsuarioMasterDto) => {
        const response = await apiClient.post('/auth-secundario/usuarios', data)
        return response.data
    },

    listarRoles: async (): Promise<ListarRolesResponse> => {
        const response = await apiClient.get('/auth-secundario/roles')
        return response.data
    },
}
