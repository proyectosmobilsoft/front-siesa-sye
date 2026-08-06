import { apiClient } from './client'
import {
  DocumentacionRCAnulado,
  DocumentacionRCAnuladoResponse,
  ReciboCajaUsuario,
  RecibosCajaUsuarioResponse,
  ResumenConductoresDia,
  ResumenConductoresDiaResponse,
} from './types'
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

  /** Evidencia del RC que Tesorería elaboró en SIESA tras una anulación. */
  getDocumentacionAnulaciones: async (rcRowids: number[]): Promise<DocumentacionRCAnulado[]> => {
    if (rcRowids.length === 0) return []
    const response = await apiClient.get<DocumentacionRCAnuladoResponse>('/recibo-caja/anulaciones', {
      params: { rc_rowids: rcRowids.join(',') },
    })
    return response.data.data
  },

  registrarDocumentacionAnulacion: async ({
    rcRowid,
    numeroRcReemplazo,
    observacion,
  }: {
    rcRowid: number
    numeroRcReemplazo: number
    observacion?: string
  }): Promise<DocumentacionRCAnulado> => {
    const response = await apiClient.post<{ success: boolean; data: DocumentacionRCAnulado }>('/recibo-caja/anulaciones', {
      rc_rowid: rcRowid,
      numero_rc_reemplazo: numeroRcReemplazo,
      observacion: observacion || undefined,
    })
    return response.data.data
  },

  /** Tablero admin: RC del día por conductor, sin importar si ya se hizo la entrega de efectivo */
  getResumenConductoresDia: async (
    opts?: { fechaInicial?: string; fechaFinal?: string }
  ): Promise<ResumenConductoresDia> => {
    return withRetry(async () => {
      const response = await apiClient.get<ResumenConductoresDiaResponse>(
        '/recibo-caja/resumen-conductores',
        {
          params: {
            fecha_inicial: opts?.fechaInicial,
            fecha_final: opts?.fechaFinal,
          },
        }
      )
      return response.data.data
    })
  },
}
