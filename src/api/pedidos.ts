import { apiClient } from './client'
import { Pedido, PedidosResponse, PedidosParams } from './types'
import { withRetry } from '@/utils/retry'

export const pedidosApi = {
    getAll: async (params: PedidosParams): Promise<Pedido[]> => {
        return withRetry(async () => {
            const response = await apiClient.get<PedidosResponse>('/pedidos', {
                params: {
                    fechaInicial: params.fechaInicial,
                    fechaFinal: params.fechaFinal,
                },
            })
            return response.data.data
        })
    },

    preview: async (f_rowid: number): Promise<any> => {
        return withRetry(async () => {
            const response = await apiClient.post('/pedidos/preview', {
                f_rowid,
            })
            return response.data
        })
    },
}
