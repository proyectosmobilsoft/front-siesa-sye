import { apiClient } from './client'
import { MovimientoEfectivo, MovimientoEfectivoEstado, MovimientosEfectivoResponse } from './types'
import { withRetry } from '@/utils/retry'

export interface RangoFechas {
  fechaInicial?: string
  fechaFinal?: string
}

export const conductorEfectivoApi = {
  getPorEstado: async (estado: MovimientoEfectivoEstado, rango?: RangoFechas): Promise<MovimientoEfectivo[]> => {
    return withRetry(async () => {
      const response = await apiClient.get<MovimientosEfectivoResponse>(
        '/conductor-efectivo/movimientos',
        {
          params: {
            estado,
            tipo: 'DEBITO',
            fecha_inicial: rango?.fechaInicial,
            fecha_final: rango?.fechaFinal,
          },
        }
      )
      return response.data.data
    })
  },

  confirmar: async (id: number, valorConfirmado?: number): Promise<MovimientoEfectivo> => {
    const response = await apiClient.post<{ success: boolean; data: MovimientoEfectivo }>(
      `/conductor-efectivo/entrega/${id}/confirmar`,
      valorConfirmado != null ? { valor_confirmado: valorConfirmado } : {}
    )
    return response.data.data
  },
}
