import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface SesionUsuario {
  id: number
  usuario: string
  nombre_completo: string | null
  rol_id: number | null
  rol_nombre: string
  centros_operacion: string[]
}

/** Valor del selector de C.O. para ver todos los C.O. del usuario a la vez. */
export const CO_AMBOS = 'AMBOS'

/** C.O. puntual activo, o null si está en "Ambos" (o no hay ninguno). */
export const coPuntual = (co: string | null) => (co && co !== CO_AMBOS ? co : null)

interface AuthStoreState {
  sesion: SesionUsuario | null
  permisos: string[]
  centroOperacionActivo: string | null
  setSession: (sesion: SesionUsuario, permisos: string[]) => void
  setCentroOperacionActivo: (codigo: string) => void
  clearSession: () => void
  hasPermiso: (codigo: string) => boolean
}

export const useAuthStore = create<AuthStoreState>()(
  persist(
    (set, get) => ({
      sesion: null,
      permisos: [],
      centroOperacionActivo: null,

      setSession: (sesion, permisos) => set((state) => ({
        sesion,
        permisos,
        centroOperacionActivo: sesion.centros_operacion.includes(state.centroOperacionActivo ?? '') ||
          (state.centroOperacionActivo === CO_AMBOS && sesion.centros_operacion.length > 1)
          ? state.centroOperacionActivo
          : (sesion.centros_operacion[0] ?? null),
      })),

      setCentroOperacionActivo: (codigo) => set((state) => ({
        centroOperacionActivo: state.sesion?.centros_operacion.includes(codigo) ||
          (codigo === CO_AMBOS && (state.sesion?.centros_operacion.length ?? 0) > 1)
          ? codigo
          : state.centroOperacionActivo,
      })),

      clearSession: () => set({ sesion: null, permisos: [], centroOperacionActivo: null }),

      hasPermiso: (codigo: string) => {
        const { permisos } = get()
        return permisos.includes(codigo)
      },
    }),
    { name: 'auth-session' }
  )
)
