import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/api/client'

/** Fecha (YYYY-MM-DD) del primer registro de cada módulo; límite inferior de los calendarios. */
export interface FechasLimite {
  recibos: string | null
  recibos_app: string | null
  traslados: string | null
  entregas: string | null
}

export const useFechasLimite = () =>
  useQuery({
    queryKey: ['fechas-limite'],
    queryFn: async () => (await apiClient.get<{ success: boolean; data: FechasLimite }>('/fechas-limite')).data.data,
    staleTime: 60 * 60 * 1000,
  })

/** Hoy en hora local, YYYY-MM-DD (límite superior: no hay registros futuros). */
export const hoyLocalIso = () => {
  const h = new Date()
  return `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, '0')}-${String(h.getDate()).padStart(2, '0')}`
}
