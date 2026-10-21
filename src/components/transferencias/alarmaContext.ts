import { createContext, useContext } from 'react'

export interface AlarmaState {
  total: number
  activa: boolean
  silenciada: boolean
  permisoNotificaciones: NotificationPermission | 'unsupported'
  activar: () => void
  silenciar: () => void
}

export const AlarmaContext = createContext<AlarmaState | null>(null)
export const useAlarmaTransferencias = () => useContext(AlarmaContext)
