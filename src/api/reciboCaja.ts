import { apiClient } from './client'
import { ReciboCajaUsuario, RecibosCajaUsuarioResponse } from './types'
import { withRetry } from '@/utils/retry'

export const reciboCajaApi = {
  getPorUsuario: async (
    usuario: string,
    opts?: { fechaInicial?: string; fechaFinal?: string; tipo?: string }
  ): Promise<ReciboCajaUsuario[]> => {
    return withRetry(async () => {
      const response = await apiClient.get<RecibosCajaUsuarioResponse>(
        '/recibo-caja/por-usuario',
        {
          params: {
            usuario,
            fecha_inicial: opts?.fechaInicial,
            fecha_final: opts?.fechaFinal,
            tipo: opts?.tipo,
          },
        }
      )
      return response.data.data
    })
  },
}
