import { useQuery } from '@tanstack/react-query'
import { conductorEfectivoApi, RangoFechas } from '@/api/conductorEfectivo'
import { MovimientoEfectivo, MovimientoEfectivoEstado } from '@/api/types'
import { useAuthStore } from '@/store/authStore'

export const useEntregasPorEstado = (estado: MovimientoEfectivoEstado, rango?: RangoFechas) => {
  // El API filtra por el C.O. activo: al cambiarlo se vuelve a consultar
  const centro = useAuthStore(s => s.centroOperacionActivo)
  return useQuery<MovimientoEfectivo[]>({
    queryKey: ['conductor-efectivo', 'por-estado', estado, rango?.fechaInicial, rango?.fechaFinal, centro],
    queryFn: () => conductorEfectivoApi.getPorEstado(estado, rango),
    staleTime: 30 * 1000,
    retry: 3,
  })
}
