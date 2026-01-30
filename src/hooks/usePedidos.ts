import { useQuery } from '@tanstack/react-query'
import { pedidosApi } from '@/api/pedidos'
import { Pedido, PedidosParams } from '@/api/types'

export const usePedidos = (params?: PedidosParams) => {
    return useQuery<Pedido[]>({
        queryKey: ['pedidos', params],
        queryFn: () => pedidosApi.getAll(params!),
        enabled: !!params?.fechaInicial && !!params?.fechaFinal,
        staleTime: 5 * 60 * 1000,
        retry: 3,
    })
}
