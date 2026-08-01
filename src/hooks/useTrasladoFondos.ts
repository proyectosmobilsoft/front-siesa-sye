import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  trasladoFondosApi,
  RangoFechasTraslado,
  CrearTrasladoFondosPayload,
} from '@/api/trasladoFondos'

export const useTrasladosFondos = (rango?: RangoFechasTraslado) => {
  return useQuery({
    queryKey: ['traslado-fondos', rango?.fechaInicial, rango?.fechaFinal],
    queryFn: () => trasladoFondosApi.listar(rango),
    staleTime: 30 * 1000,
    retry: 3,
  })
}

export const useCrearTrasladoFondos = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CrearTrasladoFondosPayload) => trasladoFondosApi.crear(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['traslado-fondos'] })
    },
  })
}
