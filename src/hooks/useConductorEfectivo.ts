import { useQuery } from '@tanstack/react-query'
import { conductorEfectivoApi, RangoFechas } from '@/api/conductorEfectivo'
import { MovimientoEfectivo, MovimientoEfectivoEstado } from '@/api/types'

export const useEntregasPorEstado = (estado: MovimientoEfectivoEstado, rango?: RangoFechas) => {
  return useQuery<MovimientoEfectivo[]>({
    queryKey: ['conductor-efectivo', 'por-estado', estado, rango?.fechaInicial, rango?.fechaFinal],
    queryFn: () => conductorEfectivoApi.getPorEstado(estado, rango),
    staleTime: 30 * 1000,
    retry: 3,
  })
}
