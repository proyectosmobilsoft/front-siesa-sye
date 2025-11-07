import { useQuery } from '@tanstack/react-query'
import { facturasApi } from '@/api/facturas'
import { TendenciaMensual, TendenciaMensualParams } from '@/api/types'

export const useTendenciaMensual = (params?: TendenciaMensualParams) => {
  return useQuery<TendenciaMensual[]>({
    queryKey: ['tendencia-mensual', params],
    queryFn: () => facturasApi.getTendenciaMensual(params),
    enabled: !!params && !!params.periodoInicial && !!params.periodoFinal,
    staleTime: 5 * 60 * 1000,
    retry: 3,
  })
}

