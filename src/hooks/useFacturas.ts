import { useQuery } from '@tanstack/react-query'
import { facturasApi } from '@/api/facturas'
import { Factura, FacturasParams } from '@/api/types'

export const useFacturas = (params?: FacturasParams) => {
  return useQuery<Factura[]>({
    queryKey: ['facturas', params],
    queryFn: () => facturasApi.getAll(params),
    enabled: !!params,
    staleTime: 5 * 60 * 1000,
    retry: 3,
  })
}
