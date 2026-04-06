import { useQuery } from '@tanstack/react-query'
import { anticiposOperativosApi } from '@/api/anticiposOperativos'
import { AnticipoOperativo } from '@/api/types'

export const useAnticiposOperativos = () => {
  return useQuery<AnticipoOperativo[]>({
    queryKey: ['anticipos-operativos', 'solicitudes'],
    queryFn: anticiposOperativosApi.getSolicitudes,
    staleTime: 2 * 60 * 1000,
    retry: 3,
  })
}
