import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface SesionUsuario {
  id: number
  usuario: string
  nombre_completo: string | null
  rol_id: number | null
  rol_nombre: string
}

interface AuthStoreState {
  sesion: SesionUsuario | null
  permisos: string[]
  setSession: (sesion: SesionUsuario, permisos: string[]) => void
  clearSession: () => void
  hasPermiso: (codigo: string) => boolean
}

export const useAuthStore = create<AuthStoreState>()(
  persist(
    (set, get) => ({
      sesion: null,
      permisos: [],

      setSession: (sesion, permisos) => set({ sesion, permisos }),

      clearSession: () => set({ sesion: null, permisos: [] }),

      hasPermiso: (codigo: string) => {
        const { permisos } = get()
        return permisos.includes(codigo)
      },
    }),
    { name: 'auth-session' }
  )
)
