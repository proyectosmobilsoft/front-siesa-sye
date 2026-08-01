import { apiClient } from './client'
import {
  TrasladoFondos,
  TrasladoFondosResponse,
  TrasladosFondosResponse,
} from './types'
import { withRetry } from '@/utils/retry'

/**
 * Traslado de Fondos entre cajas — contrato pendiente de implementar en backend.
 * Ver docs/traslado-fondos.md para el detalle completo (payloads, validaciones,
 * permiso requerido).
 */
export interface RangoFechasTraslado {
  fechaInicial?: string
  fechaFinal?: string
}

export interface CrearTrasladoFondosPayload {
  caja_origen_id: string
  caja_destino_id: string
  valor: number
  referencia?: string
}

export const trasladoFondosApi = {
  listar: async (rango?: RangoFechasTraslado): Promise<TrasladoFondos[]> => {
    return withRetry(async () => {
      const response = await apiClient.get<TrasladosFondosResponse>(
        '/traslado-fondos',
        {
          params: {
            fecha_inicial: rango?.fechaInicial,
            fecha_final: rango?.fechaFinal,
          },
        }
      )
      return response.data.data
    })
  },

  crear: async (payload: CrearTrasladoFondosPayload): Promise<TrasladoFondos> => {
    // Sin reintentos a propósito: es una operación de dinero que no debe
    // reenviarse sola ante un timeout (mismo criterio que conductorEfectivoApi).
    const response = await apiClient.post<TrasladoFondosResponse>(
      '/traslado-fondos',
      payload
    )
    return response.data.data
  },
}
