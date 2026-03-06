import { apiClient } from './client'

export interface UsuarioMaster {
    id: number
    usuario: string
    rol_id?: number
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
    credencial?: string
    contraseña?: string
    email?: string | null
    telefono?: string | null
    nombre_completo?: string | null
    observaciones?: string | null
    activo: boolean
}

export interface UpdateUsuarioMasterDto {
    usuario?: string
    rol_id?: number
    credencial?: string
    contraseña?: string
    email?: string | null
    telefono?: string | null
    nombre_completo?: string | null
    observaciones?: string | null
    activo?: boolean
}

export interface AuthRole {
    id: number
    nombre: string
    pin: boolean // true si usa PIN, false si usa contraseña
    estado: number | boolean // 1/true = activo, 0/false = inactivo
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

    obtenerUsuario: async (usuario: string): Promise<UsuarioMaster> => {
        const response = await apiClient.get(`/auth-secundario/usuarios/${usuario}`)
        return response.data?.data || response.data
    },

    crearUsuario: async (data: CreateUsuarioMasterDto) => {
        const response = await apiClient.post('/auth-secundario/usuarios', data)
        return response.data
    },

    actualizarUsuario: async (id: number, data: UpdateUsuarioMasterDto) => {
        const response = await apiClient.put(`/auth-secundario/usuarios/${id}`, data)
        return response.data
    },

    eliminarUsuario: async (id: number) => {
        const response = await apiClient.delete(`/auth-secundario/usuarios/${id}`)
        return response.data
    },

    listarRoles: async (): Promise<ListarRolesResponse> => {
        const response = await apiClient.get('/auth-secundario/roles')
        const raw = response.data
        // Normalizar: el backend puede devolver "Estado" (mayúscula) o "estado" (minúscula)
        if (raw?.data && Array.isArray(raw.data)) {
            raw.data = raw.data.map((role: any) => ({
                id: role.id,
                nombre: role.nombre,
                pin: role.pin,
                estado: role.estado ?? role.Estado ?? 1,
            }))
        }
        return raw
    },

    crearRol: async (data: { nombre: string; pin: boolean; estado?: boolean }) => {
        const response = await apiClient.post('/auth-secundario/roles', data)
        return response.data
    },

    actualizarRol: async (id: number, data: { nombre?: string; pin?: boolean; estado?: boolean }) => {
        const response = await apiClient.put(`/auth-secundario/roles/${id}`, data)
        return response.data
    },

    eliminarRol: async (id: number) => {
        const response = await apiClient.delete(`/auth-secundario/roles/${id}`)
        return response.data
    },
}
