import { apiClient } from './client'
import { AnticipoOperativo, AnticiposOperativosResponse, AnticipoOperativoUpdatePayload, DistribucionItem, DistribucionResponse, Soporte, SoportesResponse } from './types'
import { withRetry } from '@/utils/retry'

export const anticiposOperativosApi = {
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

  update: async (id: number, payload: AnticipoOperativoUpdatePayload): Promise<AnticipoOperativo> => {
    return withRetry(async () => {
      const response = await apiClient.put<{ success: boolean; data: AnticipoOperativo }>(
        `/anticipos-operativos/solicitudes/${id}`,
        payload
      )
      return response.data.data
    })
  },
}
