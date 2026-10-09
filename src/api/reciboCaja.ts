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

/** Cuenta contable resuelta contra SIESA (f253_id + metadata). */
export interface CuentaParametroRC {
  cuenta: string
  rowid: number | null
  descripcion: string | null
}

export interface ParametrosReciboCaja {
  limite_ajuste_peso: number
  exigir_aprobacion_transferencia: boolean
  cuentas: {
    cuenta_ajuste_peso_descuento: CuentaParametroRC
    cuenta_ajuste_peso_ingreso: CuentaParametroRC
    cuenta_descuento_financiero: CuentaParametroRC
    cuenta_descuento_financiero_nif: CuentaParametroRC
    cuenta_anticipo: CuentaParametroRC
  }
}

export interface ParametrosReciboCajaUpdate {
  limite_ajuste_peso?: number
  exigir_aprobacion_transferencia?: boolean
  cuenta_ajuste_peso_descuento?: string
  cuenta_ajuste_peso_ingreso?: string
  cuenta_descuento_financiero?: string
  cuenta_descuento_financiero_nif?: string
  cuenta_anticipo?: string
}

interface ParametrosReciboCajaResponse {
  success: boolean
  data: ParametrosReciboCaja
}

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

  getParametros: async (): Promise<ParametrosReciboCaja> => {
    const response = await apiClient.get<ParametrosReciboCajaResponse>('/recibo-caja/parametros')
    return response.data.data
  },

  actualizarParametros: async (
    body: ParametrosReciboCajaUpdate
  ): Promise<ParametrosReciboCaja> => {
    const response = await apiClient.put<ParametrosReciboCajaResponse>(
      '/recibo-caja/parametros',
      body
    )
    return response.data.data
  },
}
