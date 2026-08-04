import { apiClient } from './client'
import { Pedido, PedidosResponse, PedidosParams } from './types'

// Sin withRetry a propósito: usePedidos ya usa retry:3 de React Query.
// Ver comentario en clients.ts.
export const pedidosApi = {
    getAll: async (params: PedidosParams): Promise<Pedido[]> => {
        const response = await apiClient.get<PedidosResponse>('/pedidos', {
            params: {
                fechaInicial: params.fechaInicial,
                fechaFinal: params.fechaFinal,
            },
        })
        return response.data.data
    },

    preview: async (f_rowid: number): Promise<any> => {
        const response = await apiClient.post('/pedidos/preview', {
            f_rowid,
        })
        return response.data
    },
}
