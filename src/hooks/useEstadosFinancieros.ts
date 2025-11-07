import { useQuery } from '@tanstack/react-query'
import { facturasApi } from '@/api/facturas'
import { EstadoFinanciero, EstadosFinancierosParams } from '@/api/types'

export const useEstadosFinancieros = (params?: EstadosFinancierosParams) => {
  return useQuery<EstadoFinanciero[]>({
    queryKey: ['estados-financieros', params],
    queryFn: () => facturasApi.getEstadosFinancieros(params),
    enabled: !!params && !!params.periodoInicial && !!params.periodoFinal,
    staleTime: 5 * 60 * 1000,
    retry: 3,
  })
}

