import { create } from 'zustand'
import type { Pestana } from '@/config/pestanas'

/**
 * Lo que la tira de pestañas del header necesita ver. El dueño del estado es PestanasPanels (que sabe de la
 * ruta y mantiene las páginas montadas); aquí solo se refleja, junto con la acción de cerrar.
 */
interface PestanasEstado {
  tabs: Pestana[]
  activa: string
  /** true cuando se intentó abrir una pestaña de más (ya hay el máximo). */
  aviso: boolean
  cerrar: (key: string) => void
}

export const usePestanasStore = create<PestanasEstado>(() => ({ tabs: [], activa: '/', aviso: false, cerrar: () => {} }))
