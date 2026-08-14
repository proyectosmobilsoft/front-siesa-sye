import { apiClient } from './client'
import {
  DailyOrder,
  DailyOrdersResponse,
  DailyOrdersStatusBreakdownItem,
  DailyOrdersStatusBreakdownResponse,
  SalesSummary,
  SalesSummaryResponse,
  Vendor,
  VendorsResponse,
} from './types'

// Sin withRetry a propósito: los hooks (useVendors, etc.) ya usan
// retry:3 de React Query. Ver comentario en clients.ts.
export const reportsApi = {
  getDailyOrders: async (): Promise<DailyOrder[]> => {
    const response = await apiClient.get<DailyOrdersResponse>(
      '/reports/daily-orders'
    )
    return response.data.data
  },

  getRecentOrders: async (limit = 8): Promise<DailyOrder[]> => {
    const response = await apiClient.get<DailyOrdersResponse>(
      '/reports/daily-orders',
      { params: { limit, sort: 'desc', sortBy: 'fecha' } }
    )
    return response.data.data
  },

  getDailyOrdersStatusBreakdown: async (): Promise<DailyOrdersStatusBreakdownItem[]> => {
    const response = await apiClient.get<DailyOrdersStatusBreakdownResponse>(
      '/reports/daily-orders',
      { params: { groupBy: 'estado' } }
    )
    return response.data.data
  },

  getSalesSummary: async (): Promise<SalesSummary[]> => {
    const response = await apiClient.get<SalesSummaryResponse>(
      '/reports/sales-summary'
    )
    return response.data.data
  },

  getVendors: async (date?: string, limit = 5): Promise<Vendor[]> => {
    const response = await apiClient.get<VendorsResponse>(
      '/reports/vendors',
      { params: { date, limit } }
    )
    return response.data.data
  },
}
