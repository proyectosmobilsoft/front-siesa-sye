import { useQuery } from '@tanstack/react-query'
import { facturasApi } from '@/api/facturas'
import { PerdidasGanancias, PerdidasGananciasParams } from '@/api/types'

export const usePerdidasGanancias = (params?: PerdidasGananciasParams) => {
  return useQuery<PerdidasGanancias[]>({
    queryKey: ['perdidas-ganancias', params],
    queryFn: () => facturasApi.getPerdidasGanancias(params),
    enabled: !!params && !!params.periodoInicial && !!params.periodoFinal,
    staleTime: 5 * 60 * 1000,
    retry: 3,
  })
}

