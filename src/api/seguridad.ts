import { apiClient } from './client'

export interface RolEnUsuario {
    id: number
    nombre?: string
}

/**
 * Maquinaria asignada a un usuario (tabla auth_usuario_maquinaria).
 * Un usuario puede tener varias; como máximo una con en_uso = true, que es la
 * que está conduciendo actualmente.
 */
export interface MaquinariaAsignada {
    id?: number
    usuario_id?: number
    maquinaria_cod: number
    placa: string | null
    categoria: string | null
    en_uso: boolean
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
    created_at: string
    updated_at: string
    ultimo_acceso: string | null
    siesa_rowid?: number | null
    siesa_nombre?: string | null
    /** Maquinaria asignada (solo roles con MODULO_CONDUCTOR) */
    maquinaria_cod?: number | null
    maquinaria_placa?: string | null
    maquinaria_categoria?: string | null
    /** Lista completa de maquinarias asignadas (reemplaza al par plano) */
    maquinarias?: MaquinariaAsignada[]
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

export interface SiesaUsuario {
    f552_rowid: number
    f552_nombre: string
    f552_descripcion: string
    f552_correo_electronico: string | null
    f552_esactivo: number
    f552_ind_estado: number
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
    siesa_rowid?: number | null
    siesa_nombre?: string | null
    maquinaria_cod?: number | null
    maquinaria_placa?: string | null
    maquinaria_categoria?: string | null
    /** Lista completa de maquinarias asignadas (reemplaza al par plano) */
    maquinarias?: MaquinariaAsignada[]
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
    siesa_rowid?: number | null
    siesa_nombre?: string | null
    maquinaria_cod?: number | null
    maquinaria_placa?: string | null
    maquinaria_categoria?: string | null
    /** Lista completa de maquinarias asignadas (reemplaza al par plano) */
    maquinarias?: MaquinariaAsignada[]
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

/**
 * Tipo de un permiso dentro de su módulo (columna Tipo de auth_permisos):
 * - VISTA: da acceso al módulo. El API lo agrega solo si el rol tiene
 *   cualquier otra acción del mismo módulo, así que en la UI va fijo.
 * - ACCION: operación dentro del módulo (crear, aprobar, …).
 * - TAB: visibilidad de una pestaña dentro del módulo.
 * - ESPECIAL: marca de comportamiento, no es una pantalla (MODULO_CONDUCTOR).
 */
export type TipoPermiso = 'VISTA' | 'ACCION' | 'TAB' | 'ESPECIAL'

export interface PermisoDeModulo {
    id: number
    codigo: string
    descripcion?: string | null
    /** Nombre corto y legible ("Crear", "Aprobar", "Rechazadas") */
    etiqueta: string
    tipo: TipoPermiso
    orden: number
    /** Solo lo devuelve el modo `todos` del maestro; en Roles siempre es true */
    estado?: boolean
}

export interface ModuloPermisos {
    /** null en el módulo sintético SIN_CLASIFICAR que arma el API */
    id: number | null
    codigo: string
    nombre: string
    grupo?: string | null
    /** Nombre de un icono de lucide-react */
    icono?: string | null
    orden: number
    /** Solo lo devuelve el modo `todos` del maestro; en Roles siempre es true */
    estado?: boolean
    permisos: PermisoDeModulo[]
}

export interface ListarModulosResponse {
    success?: boolean
    data: ModuloPermisos[]
}

export interface CrearModuloDto {
    codigo: string
    nombre: string
    grupo?: string | null
    /** Nombre de un icono de lucide-react (ej. "Archive") */
    icono?: string | null
    orden?: number
    estado?: boolean
}

export interface CrearPermisoDto {
    codigo: string
    descripcion?: string | null
    modulo_id?: number | null
    tipo?: TipoPermiso
    etiqueta?: string | null
    orden?: number
    estado?: boolean
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

    /**
     * Usuarios cuyo rol tiene MODULO_CONDUCTOR, con sus maquinarias asignadas.
     * Lo consume el formulario de Interfaz Contable Vehículos para ofrecer solo
     * las placas que el conductor realmente tiene.
     */
    listarConductores: async (): Promise<{ success: boolean; data: UsuarioMaster[] }> => {
        const response = await apiClient.get('/auth-secundario/conductores')
        const raw = response.data
        const data: UsuarioMaster[] = Array.isArray(raw) ? raw : (raw?.data ?? [])
        return { success: true, data }
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

    /**
     * Catálogo de permisos ya agrupado por módulo (auth_modulos).
     * La agrupación vive en BD, así que un permiso nuevo aparece aquí sin
     * tocar el front.
     */
    listarModulos: async (todos = false): Promise<ListarModulosResponse> => {
        const response = await apiClient.get('/auth-secundario/modulos', {
            // `todos` incluye lo inactivo y los módulos vacíos: solo lo necesita
            // el maestro de Módulos y Permisos, no el selector de Roles.
            params: todos ? { todos: true } : undefined,
        })
        const raw = response.data
        const data: ModuloPermisos[] = (raw?.data || []).map((m: any) => ({
            id: m.id ?? null,
            codigo: m.codigo ?? '',
            nombre: m.nombre ?? m.codigo ?? '',
            grupo: m.grupo ?? null,
            icono: m.icono ?? null,
            orden: m.orden ?? 999,
            estado: m.estado ?? true,
            permisos: (m.permisos || []).map((p: any) => ({
                id: p.id,
                codigo: p.codigo ?? '',
                descripcion: p.descripcion ?? null,
                etiqueta: p.etiqueta || p.codigo || '',
                tipo: (p.tipo || 'ACCION') as TipoPermiso,
                orden: p.orden ?? 999,
                estado: p.estado ?? true,
            })),
        }))
        return { success: raw?.success, data }
    },

    // --- Maestro de Módulos y Permisos ---
    // El `codigo` de un permiso NO se envía en la actualización: está escrito a
    // mano en los requirePermiso del backend y en PERMISOS, así que renombrarlo
    // desde la pantalla dejaría roles apuntando a un permiso que no valida nada.

    crearModulo: async (data: CrearModuloDto) => {
        const response = await apiClient.post('/auth-secundario/modulos', data)
        return response.data
    },

    actualizarModulo: async (id: number, data: Partial<CrearModuloDto>) => {
        const response = await apiClient.put(`/auth-secundario/modulos/${id}`, data)
        return response.data
    },

    eliminarModulo: async (id: number) => {
        const response = await apiClient.delete(`/auth-secundario/modulos/${id}`)
        return response.data
    },

    crearPermiso: async (data: CrearPermisoDto) => {
        const response = await apiClient.post('/auth-secundario/permisos', data)
        return response.data
    },

    actualizarPermiso: async (id: number, data: Omit<Partial<CrearPermisoDto>, 'codigo'>) => {
        const response = await apiClient.put(`/auth-secundario/permisos/${id}`, data)
        return response.data
    },

    eliminarPermiso: async (id: number) => {
        const response = await apiClient.delete(`/auth-secundario/permisos/${id}`)
        return response.data
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

    listarSiesaUsuarios: async (search?: string, activos = true): Promise<{ success: boolean; total: number; data: SiesaUsuario[] }> => {
        const params: Record<string, any> = { activos }
        if (search?.trim()) params.search = search.trim()
        const response = await apiClient.get('/siesa-usuarios', { params })
        return response.data
    },
}
