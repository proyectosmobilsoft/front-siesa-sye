import { createContext, useContext } from 'react'

export interface AlarmaState {
  total: number
  activa: boolean
  sonidoBloqueado: boolean
  permisoNotificaciones: NotificationPermission | 'unsupported'
  activar: () => void
  habilitarSonido: () => void
  verSolicitud: (id: number) => void
}

export const AlarmaContext = createContext<AlarmaState | null>(null)
export const useAlarmaTransferencias = () => useContext(AlarmaContext)
