import { apiClient } from './client'

export interface RolEnUsuario {
    id: number
    nombre?: string
}

export interface UsuarioMaster {
    id: number
    usuario: string
    rol_id?: number
    roles?: RolEnUsuario[]
    email: string | null
    telefono: string | null
    nombre_completo: string | null
    observaciones?: string | null
    forma_pago?: string | null
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
    forma_pago?: string | null
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
    forma_pago?: string | null
    activo?: boolean
}

export interface PermisoEnRol {
    id: number
    codigo: string
    descripcion?: string
    estado?: boolean
}

export interface AuthRole {
    id: number
    nombre: string
    pin: boolean // true si usa PIN, false si usa contraseña
    estado: number | boolean // 1/true = activo, 0/false = inactivo
    permisos?: PermisoEnRol[]
}

/** Código de permiso: mostrar datos de conductor (ej. forma de pago en usuario). */
export const PERMISO_MODULO_CONDUCTOR = 'MODULO_CONDUCTOR'

export function rolTieneModuloConductor(rol: AuthRole | null | undefined): boolean {
    return !!rol?.permisos?.some((p) => p.codigo === PERMISO_MODULO_CONDUCTOR)
}

export interface ListarRolesResponse {
    success: boolean
    data: AuthRole[]
}

export interface Permiso {
    id?: number
    codigo: string
    nombre?: string
}

export interface ListarPermisosResponse {
    success?: boolean
    data: Permiso[]
}

export const seguridadApi = {
    listarUsuarios: async (page = 1, pageSize = 100, search = ''): Promise<ListarUsuariosResponse> => {
        const params: Record<string, any> = { page, pageSize }
        if (search.trim()) params.search = search.trim()
        const response = await apiClient.get('/auth-secundario/usuarios', { params })
        const raw = response.data
        // Normalizar: asegurar rol_id desde roles[0] si viene en el JSON
        if (raw?.data && Array.isArray(raw.data)) {
            raw.data = raw.data.map((u: any) => ({
                ...u,
                rol_id: u.rol_id ?? u.roles?.[0]?.id ?? u.Roles?.[0]?.id,
                roles: u.roles ?? u.Roles ?? [],
            }))
        }
        return raw
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
        const raw = response.data?.data || response.data
        if (raw) {
            raw.rol_id = raw.rol_id ?? raw.roles?.[0]?.id ?? raw.Roles?.[0]?.id
            raw.roles = raw.roles ?? raw.Roles ?? []
        }
        return raw
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
        // Normalizar campos que el backend puede devolver en mayúscula o minúscula
        if (raw?.data && Array.isArray(raw.data)) {
            raw.data = raw.data.map((role: any) => {
                // Permisos: el backend puede devolver "permisos", "Permisos"
                // o en tabla intermedia como { Permiso: { codigo: ... } }
                const permisosRaw: any[] = role.permisos ?? role.Permisos ?? []
                const permisos: PermisoEnRol[] = permisosRaw.map((p: any) => {
                    // Soporte para ORM con relación intermedia: { Permiso: { id, codigo } }
                    const fuente = p.Permiso ?? p.permiso ?? p
                    return {
                        id: fuente.id ?? fuente.ID,
                        codigo: fuente.codigo ?? fuente.Codigo ?? '',
                        descripcion: fuente.descripcion ?? fuente.Descripcion,
                        estado: fuente.estado ?? fuente.Estado,
                    }
                })
                return {
                    id: role.id,
                    nombre: role.nombre,
                    pin: role.pin,
                    estado: role.estado ?? role.Estado ?? 1,
                    permisos,
                }
            })
        }
        return raw
    },

    listarPermisos: async (): Promise<ListarPermisosResponse> => {
        const response = await apiClient.get('/auth-secundario/permisos')
        const raw = response.data
        if (raw?.data && Array.isArray(raw.data)) {
            raw.data = raw.data.map((p: any) => ({
                id: p.id ?? p.ID,
                codigo: p.codigo ?? p.Codigo ?? '',
                nombre: p.nombre ?? p.Nombre,
            }))
            return raw
        }
        return { data: raw?.data || [] }
    },

    crearRol: async (data: { nombre: string; pin: boolean; estado?: boolean; permisos?: number[] }) => {
        const response = await apiClient.post('/auth-secundario/roles', data)
        return response.data
    },

    actualizarRol: async (id: number, data: { nombre?: string; pin?: boolean; estado?: boolean; permisos?: number[] }) => {
        const response = await apiClient.put(`/auth-secundario/roles/${id}`, data)
        return response.data
    },

    eliminarRol: async (id: number) => {
        const response = await apiClient.delete(`/auth-secundario/roles/${id}`)
        return response.data
    },
}
