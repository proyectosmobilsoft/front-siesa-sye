import { createContext, useContext } from 'react'
import type { EspecDetalle } from './tipos'

export interface ContextoDetalle {
  abrir: (espec: EspecDetalle) => void
}

export const Contexto = createContext<ContextoDetalle | null>(null)

/** Quien lo use dentro de un `DetalleProvider` puede abrir la tabla de registros de una métrica. */
export const useDetalle = () => useContext(Contexto)
