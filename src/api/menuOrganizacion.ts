import { apiClient } from './client'
import type { OrganizacionPagina } from '@/config/organizarMenu'

const BASE = '/auth-secundario/menu-organizacion'
export const MENU_ORGANIZACION_KEY = ['menu-organizacion'] as const

export const menuOrganizacionApi = {
    /** En qué menú, orden y visibilidad dejó el administrador cada página (lo que no aparece sigue como el código) */
    listar: async (): Promise<OrganizacionPagina[]> => (await apiClient.get(BASE)).data?.data ?? [],
    guardar: async (paginas: OrganizacionPagina[]) => (await apiClient.put(BASE, { paginas })).data,
    restablecer: async () => (await apiClient.delete(BASE)).data,
}
