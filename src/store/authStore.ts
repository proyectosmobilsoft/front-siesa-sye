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
        centroOperacionActivo: sesion.centros_operacion.includes(state.centroOperacionActivo ?? '')
          ? state.centroOperacionActivo
          : (sesion.centros_operacion[0] ?? null),
      })),

      setCentroOperacionActivo: (codigo) => set((state) => ({
        centroOperacionActivo: state.sesion?.centros_operacion.includes(codigo)
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
