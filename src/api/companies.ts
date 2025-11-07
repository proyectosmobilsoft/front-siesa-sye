import { apiClient } from './client'
import { Company, CompaniesResponse } from './types'
import { withRetry } from '@/utils/retry'

export const companiesApi = {
  getAll: async (): Promise<Company[]> => {
    return withRetry(async () => {
      const response = await apiClient.get<CompaniesResponse>('/companies')
      return response.data.data
    })
  },

  getById: async (id: number): Promise<Company> => {
    return withRetry(async () => {
      const response = await apiClient.get<{ success: boolean; data: Company }>(
        `/companies/${id}`
      )
      return response.data.data
    })
  },

  getByYear: async (year: number): Promise<Company[]> => {
    return withRetry(async () => {
      const response = await apiClient.get<CompaniesResponse>(
        `/companies/year/${year}`
      )
      return response.data.data
    })
  },
}
