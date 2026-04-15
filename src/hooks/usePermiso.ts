import { useAuthStore } from '@/store/authStore'
import { PERMISOS } from '@/config/permisos'

/**
 * Hook para verificar permisos dentro de componentes y páginas.
 *
 * Uso:
 *   const { puede } = usePermiso()
 *   puede('EDITAR_ANTICIPO')  → true / false
 *
 * También exporta el objeto PERMISOS para no importarlo por separado:
 *   const { puede, P } = usePermiso()
 *   puede(P.EDITAR_ANTICIPO)
 */
export const usePermiso = () => {
  const { hasPermiso, sesion, permisos } = useAuthStore()

  return {
    /** Verifica si el usuario tiene el permiso indicado */
    puede: (codigo: string) => hasPermiso(codigo),

    /** Acceso rápido a los códigos de permisos */
    P: PERMISOS,

    /** Datos de la sesión actual */
    sesion,

    /** Lista completa de permisos del usuario */
    permisos,
  }
}
