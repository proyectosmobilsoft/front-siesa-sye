import { apiClient } from './client'
import { AnticipoOperativo, AnticiposOperativosResponse, AnticipoOperativoCrearPayload, AnticipoOperativoUpdatePayload, CajaDesembolso, DesembolsoResult, DistribucionItem, DistribucionResponse, DocumentoEgreso, DispersionCatalogos, DispersionItemPayload, DispersionRealizada, EgresoDispersable, Soporte, SoportesResponse } from './types'
import { withRetry } from '@/utils/retry'

export const anticiposOperativosApi = {
  cambiarEstado: async (id: number, payload: { estado: 'AUTORIZADA' | 'RECHAZADA' | 'ESPERA EFECTIVO'; observacion?: string }): Promise<AnticipoOperativo> => {
    const response = await apiClient.patch<{ success: boolean; data: AnticipoOperativo }>(
      `/anticipos-operativos/solicitudes/${id}/estado`, payload, { silenciarAviso: true }
    )
    return response.data.data
  },

  dispersionCatalogos: async (): Promise<DispersionCatalogos> => {
    const response = await apiClient.get<{ success: boolean; data: DispersionCatalogos }>('/anticipos-operativos/dispersion/catalogos', { silenciarAviso: true })
    return response.data.data
  },

  egresosDispersables: async (): Promise<EgresoDispersable[]> => {
    const response = await apiClient.get<{ success: boolean; data: EgresoDispersable[] }>('/anticipos-operativos/dispersion/egresos', { silenciarAviso: true })
    return response.data.data
  },

  dispersionesDelEgreso: async (id: number): Promise<DispersionRealizada[]> => {
    const response = await apiClient.get<{ success: boolean; data: DispersionRealizada[] }>(`/anticipos-operativos/solicitudes/${id}/dispersiones`, { silenciarAviso: true })
    return response.data.data
  },

  dispersar: async (id: number, payload: { tipo: 'TRANSPORTE'; fecha: string; hora: string; items: DispersionItemPayload[] }) => {
    const response = await apiClient.post<{ success: boolean; data: { total: number; disponible_restante: number } }>(
      `/anticipos-operativos/solicitudes/${id}/dispersar`, payload, { silenciarAviso: true }
    )
    return response.data.data
  },

  documentos: async (tipo?: 'PCE' | 'PLC'): Promise<DocumentoEgreso[]> => {
    const response = await apiClient.get<{ success: boolean; data: DocumentoEgreso[] }>(
      '/anticipos-operativos/documentos', { params: tipo ? { tipo } : undefined, silenciarAviso: true }
    )
    return response.data.data
  },

  cajasDesembolso: async (): Promise<CajaDesembolso[]> => {
    const response = await apiClient.get<{ success: boolean; data: CajaDesembolso[] }>(
      '/anticipos-operativos/cajas-desembolso', { silenciarAviso: true }
    )
    return response.data.data
  },

  desembolsar: async (id: number, idCaja: CajaDesembolso['id_caja']): Promise<DesembolsoResult> => {
    const response = await apiClient.post<{ success: boolean; data: DesembolsoResult }>(
      `/anticipos-operativos/solicitudes/${id}/desembolsar`, { id_caja: idCaja }, { silenciarAviso: true }
    )
    return response.data.data
  },

  crear: async (payload: AnticipoOperativoCrearPayload): Promise<AnticipoOperativo> => {
    const response = await apiClient.post<{ success: boolean; data: AnticipoOperativo }>(
      '/anticipos-operativos/solicitudes', payload, { silenciarAviso: true }
    )
    return response.data.data
  },

  getSolicitudes: async (): Promise<AnticipoOperativo[]> => {
    return withRetry(async () => {
      const response = await apiClient.get<AnticiposOperativosResponse>(
        '/anticipos-operativos/solicitudes'
      )
      return response.data.data
    })
  },

  getDistribucion: async (anticipoId: number): Promise<DistribucionItem[]> => {
    return withRetry(async () => {
      const response = await apiClient.get<DistribucionResponse>(
        '/anticipos-operativos/distribucion',
        { params: { anticipoId } }
      )
      return response.data.data
    })
  },

  getSoportes: async (anticipoId: number): Promise<Soporte[]> => {
    return withRetry(async () => {
      const response = await apiClient.get<SoportesResponse>(
        `/anticipos-operativos/solicitudes/${anticipoId}/soportes`
      )
      return response.data.data
    })
  },

  update: async (id: number, payload: AnticipoOperativoUpdatePayload, silenciarAviso = false): Promise<AnticipoOperativo> => {
    return withRetry(async () => {
      const response = await apiClient.put<{ success: boolean; data: AnticipoOperativo }>(
        `/anticipos-operativos/solicitudes/${id}`,
        payload,
        { silenciarAviso }
      )
      return response.data.data
    })
  },
}
