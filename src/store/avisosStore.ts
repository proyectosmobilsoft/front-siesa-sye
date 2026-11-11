import { create } from 'zustand'

export type TipoAviso = 'error' | 'exito' | 'info'

export interface Aviso {
  id: number
  tipo: TipoAviso
  titulo?: string
  mensaje: string
}

interface AvisosState {
  avisos: Aviso[]
  cerrar: (id: number) => void
}

export const useAvisosStore = create<AvisosState>((set) => ({
  avisos: [],
  cerrar: (id) => set((state) => ({ avisos: state.avisos.filter((item) => item.id !== id) })),
}))

let siguienteId = 0
export function avisar(tipo: TipoAviso, mensaje: string, titulo?: string) {
  if (!mensaje.trim() || useAvisosStore.getState().avisos.some((item) => item.mensaje === mensaje)) return
  const id = ++siguienteId
  useAvisosStore.setState((state) => ({
    avisos: [...state.avisos, { id, tipo, mensaje, titulo }].slice(-4),
  }))
  setTimeout(() => useAvisosStore.getState().cerrar(id), tipo === 'error' ? 8000 : 6000)
}

export const aviso = {
  error: (mensaje: string, titulo?: string) => avisar('error', mensaje, titulo),
  exito: (mensaje: string, titulo?: string) => avisar('exito', mensaje, titulo),
  info: (mensaje: string, titulo?: string) => avisar('info', mensaje, titulo),
}
