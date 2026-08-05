import { apiClient } from './client'
import {
  CajaTraspaso,
  CajasTraspasoResponse,
  TrasladoFondosCreado,
  TrasladoFondosCreadoResponse,
  TrasladoFondosMov,
  TrasladosFondosMovResponse,
} from './types'
import { withRetry } from '@/utils/retry'

/**
 * Traslado de Fondos entre cajas — conectado a /api/caja-traspaso (endpoint
 * único: GET con ?vista=historial|cajas, POST único para crear).
 * Ver docs/traslado-fondos.md para el detalle histórico de la maqueta previa.
 */
export interface RangoFechasTraslado {
  fechaInicial?: string
  fechaFinal?: string
}

export interface CrearTrasladoFondosPayload {
  id_caja_origen: string
  id_caja_destino: string
  valor: number
  notas?: string
}

export const trasladoFondosApi = {
  listarCajas: async (): Promise<CajaTraspaso[]> => {
    return withRetry(async () => {
      const response = await apiClient.get<CajasTraspasoResponse>('/caja-traspaso', {
        params: { vista: 'cajas' },
      })
      return response.data.data
    })
  },

  listar: async (rango?: RangoFechasTraslado): Promise<TrasladoFondosMov[]> => {
    return withRetry(async () => {
      const response = await apiClient.get<TrasladosFondosMovResponse>('/caja-traspaso', {
        params: {
          vista: 'historial',
          fecha_inicial: rango?.fechaInicial,
          fecha_final: rango?.fechaFinal,
        },
      })
      return response.data.data
    })
  },

  crear: async (payload: CrearTrasladoFondosPayload): Promise<TrasladoFondosCreado> => {
    // Sin reintentos a propósito: es una operación de dinero que no debe
    // reenviarse sola ante un timeout (mismo criterio que conductorEfectivoApi).
    const response = await apiClient.post<TrasladoFondosCreadoResponse>(
      '/caja-traspaso',
      payload
    )
    return response.data.data
  },
}
