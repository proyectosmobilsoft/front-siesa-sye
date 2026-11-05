import { apiClient } from './client'
import {
  CajaTraspaso,
  CajasTraspasoResponse,
  MedioPagoTraspaso,
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
  /** Default EFE si se omite. TC/TD mueven saldo de tarjeta en vez de efectivo. */
  medio_pago?: MedioPagoTraspaso
  /**
   * C.O. y auxiliar de cada caja. Hay códigos de caja repetidos entre C.O. (la `001` es Caja General del
   * 001 y también Mostrador Alematerias del 002); mandarlos evita que el API elija la caja equivocada.
   */
  id_co_origen?: string
  rowid_auxiliar_origen?: number
  id_co_destino?: string
  rowid_auxiliar_destino?: number
}

export const trasladoFondosApi = {
  /** soloMaestro=true filtra contra el maestro curado (/maestro/cajas); false trae el catálogo SIESA completo */
  listarCajas: async (soloMaestro = false): Promise<CajaTraspaso[]> => {
    return withRetry(async () => {
      const response = await apiClient.get<CajasTraspasoResponse>('/caja-traspaso', {
        params: { vista: 'cajas', solo_maestro: soloMaestro },
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
