import { useQuery } from '@tanstack/react-query'
import { reportsApi } from '@/api/reports'
import { DailyOrder, SalesSummary, Vendor } from '@/api/types'

export const useDailyOrders = () => {
  return useQuery<DailyOrder[]>({
    queryKey: ['daily-orders'],
    queryFn: reportsApi.getDailyOrders,
    staleTime: 5 * 60 * 1000, // 5 minutos
    retry: 3,
  })
}

export const useSalesSummary = () => {
  return useQuery<SalesSummary[]>({
    queryKey: ['sales-summary'],
    queryFn: reportsApi.getSalesSummary,
    staleTime: 5 * 60 * 1000, // 5 minutos
    retry: 3,
  })
}

export const useVendors = () => {
  return useQuery<Vendor[]>({
    queryKey: ['vendors'],
    queryFn: reportsApi.getVendors,
    staleTime: 5 * 60 * 1000, // 5 minutos
    retry: 3,
  })
}
