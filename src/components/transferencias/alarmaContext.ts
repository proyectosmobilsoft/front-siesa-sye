import { createContext, useContext } from 'react'

export interface AlarmaState {
  total: number
  activa: boolean
  silenciada: boolean
  sonidoBloqueado: boolean
  permisoNotificaciones: NotificationPermission | 'unsupported'
  activar: () => void
  silenciar: () => void
  habilitarSonido: () => void
  atenderPendientes: () => void
  verSolicitud: (id: number) => void
}

export const AlarmaContext = createContext<AlarmaState | null>(null)
export const useAlarmaTransferencias = () => useContext(AlarmaContext)
