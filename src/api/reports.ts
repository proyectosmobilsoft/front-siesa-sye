import { apiClient } from './client'
import { DailyOrder, DailyOrdersResponse, SalesSummary, SalesSummaryResponse, Vendor, VendorsResponse } from './types'
import { withRetry } from '@/utils/retry'

export const reportsApi = {
  getDailyOrders: async (): Promise<DailyOrder[]> => {
    return withRetry(async () => {
      const response = await apiClient.get<DailyOrdersResponse>(
        '/reports/daily-orders'
      )
      return response.data.data
    })
  },
  getSalesSummary: async (): Promise<SalesSummary[]> => {
    return withRetry(async () => {
      const response = await apiClient.get<SalesSummaryResponse>(
        '/reports/sales-summary'
      )
      return response.data.data
    })
  },
  getVendors: async (): Promise<Vendor[]> => {
    return withRetry(async () => {
      const response = await apiClient.get<VendorsResponse>(
        '/reports/vendors'
      )
      return response.data.data
    })
  },
}
