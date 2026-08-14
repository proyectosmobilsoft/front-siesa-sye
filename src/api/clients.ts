import { apiClient } from './client'
import { Client, ClientsResponse, ClientsActivosResponse } from './types'

// Sin withRetry a propósito: los hooks (useClients, etc.) ya usan
// retry:3 de React Query. Envolver acá además duplicaba los reintentos
// (hasta 3 de React Query × 3 de withRetry = 9 intentos posibles), cada
// uno trayendo el listado completo de clientes (miles de registros) sin
// paginar — carga masiva multiplicada quieta esperando a que el backend
// responda lento.
export const clientsApi = {
  getAll: async (): Promise<Client[]> => {
    const response = await apiClient.get<ClientsResponse>('/clients')
    return response.data.data
  },

  getById: async (id: number): Promise<Client> => {
    const response = await apiClient.get<{ success: boolean; data: Client }>(
      `/clients/${id}`
    )
    return response.data.data
  },

  search: async (query: string): Promise<Client[]> => {
    const response = await apiClient.get<ClientsResponse>(
      `/clients/search?q=${query}`
    )
    return response.data.data
  },

  getActivos: async (): Promise<ClientsActivosResponse['data']> => {
    const response = await apiClient.get<ClientsActivosResponse>('/clients/activos')
    return response.data.data
  },

  getCount: async (): Promise<number> => {
    const response = await apiClient.get<{ success: boolean; count: number }>(
      '/clients/count'
    )
    return response.data.count
  },
}
