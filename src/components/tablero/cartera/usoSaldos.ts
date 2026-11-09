import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import type { SaldosCartera } from '../ventas/tipos'

/** Cuadre de cartera del periodo (saldo anterior → saldo final), comerciales y corporativas. */
export function useSaldosCartera(desde: string, hasta: string) {
  return useQuery({
    queryKey: ['dashboard-cartera-saldos', desde, hasta],
    queryFn: async () => (await apiClient.get<{ success: boolean; data: SaldosCartera }>('/dashboard/cartera/saldos', { params: { desde, hasta } })).data.data,
    staleTime: 5 * 60 * 1000,
  })
}
