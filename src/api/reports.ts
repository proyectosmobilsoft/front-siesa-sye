import { apiClient } from './client'
import { DailyOrder, DailyOrdersResponse, SalesSummary, SalesSummaryResponse, Vendor, VendorsResponse } from './types'

// Sin withRetry a propósito: los hooks (useVendors, etc.) ya usan
// retry:3 de React Query. Ver comentario en clients.ts.
export const reportsApi = {
  getDailyOrders: async (): Promise<DailyOrder[]> => {
    const response = await apiClient.get<DailyOrdersResponse>(
      '/reports/daily-orders'
    )
    return response.data.data
  },
  getSalesSummary: async (): Promise<SalesSummary[]> => {
    const response = await apiClient.get<SalesSummaryResponse>(
      '/reports/sales-summary'
    )
    return response.data.data
  },
  getVendors: async (): Promise<Vendor[]> => {
    const response = await apiClient.get<VendorsResponse>(
      '/reports/vendors'
    )
    return response.data.data
  },
}
