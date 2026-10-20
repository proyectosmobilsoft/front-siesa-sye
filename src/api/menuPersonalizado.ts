import { apiClient } from './client'

/** embed / nueva: enlace externo. interno: página del propio sistema (url = ruta, ej. /clientes) */
export type ModoEnlace = 'embed' | 'nueva' | 'interno'

/** Enlace tal como lo ve el usuario en el sidebar (solo activos) */
export interface EnlaceMenu { id: number; nombre: string; url: string; modo: ModoEnlace }

export interface ModuloPersonalizadoMenu {
    id: number
    codigo: string
    nombre: string
    icono: string | null
    items: EnlaceMenu[]
}

/** Enlace del maestro de Módulos (incluye inactivos) */
export interface EnlaceAdmin extends EnlaceMenu {
    modulo_id: number
    orden: number
    estado: boolean | number
}

export interface EnlaceDto { nombre: string; url: string; modo: ModoEnlace; orden?: number; estado?: boolean }

/** Los módulos personalizados (sección propia en el sidebar) se distinguen por el prefijo PERS_ */
export const esPersonalizado = (codigo?: string | null) => !!codigo && codigo.startsWith('PERS_')

const BASE = '/auth-secundario/menu-personalizado'

export const menuPersonalizadoApi = {
    /** Secciones personalizadas que el usuario puede ver (el API filtra por el permiso VER_PERS_* de cada una) */
    menu: async (): Promise<ModuloPersonalizadoMenu[]> => {
        const res = await apiClient.get(BASE)
        return res.data?.data ?? []
    },
    crearModulo: async (data: { nombre: string; icono?: string | null; orden?: number }) => {
        const res = await apiClient.post(`${BASE}/modulos`, data)
        return res.data
    },
    listarEnlaces: async (moduloId: number): Promise<EnlaceAdmin[]> => {
        const res = await apiClient.get(`${BASE}/modulos/${moduloId}/items`)
        return res.data?.data ?? []
    },
    crearEnlace: async (moduloId: number, data: EnlaceDto) => (await apiClient.post(`${BASE}/modulos/${moduloId}/items`, data)).data,
    actualizarEnlace: async (id: number, data: EnlaceDto) => (await apiClient.put(`${BASE}/items/${id}`, data)).data,
    eliminarEnlace: async (id: number) => (await apiClient.delete(`${BASE}/items/${id}`)).data,
}

export const MENU_PERSONALIZADO_KEY = ['menu-personalizado'] as const
