import { apiClient } from './client'
import { Client, ClientsResponse, ClientsActivosResponse } from './types'
import { withRetry } from '@/utils/retry'

export const clientsApi = {
  getAll: async (): Promise<Client[]> => {
    return withRetry(async () => {
      const response = await apiClient.get<ClientsResponse>('/clients')
      return response.data.data
    })
  },

  getById: async (id: number): Promise<Client> => {
    return withRetry(async () => {
      const response = await apiClient.get<{ success: boolean; data: Client }>(
        `/clients/${id}`
      )
      return response.data.data
    })
  },

  search: async (query: string): Promise<Client[]> => {
    return withRetry(async () => {
      const response = await apiClient.get<ClientsResponse>(
        `/clients/search?q=${query}`
      )
      return response.data.data
    })
  },

  getActivos: async (): Promise<ClientsActivosResponse['data']> => {
    return withRetry(async () => {
      const response = await apiClient.get<ClientsActivosResponse>('/clients/activos')
      return response.data.data
    })
  },
}
