import { useQuery } from '@tanstack/react-query'
import { reportsApi } from '@/api/reports'
import { DailyOrder, DailyOrdersStatusBreakdownItem, SalesSummary, Vendor } from '@/api/types'

export const useDailyOrders = () => {
  return useQuery<DailyOrder[]>({
    queryKey: ['daily-orders'],
    queryFn: reportsApi.getDailyOrders,
    staleTime: 5 * 60 * 1000, // 5 minutos
    retry: 3,
  })
}

/** Últimos N pedidos ya ordenados en DB (`TOP`/`ORDER BY`) — evita traer
 * todos los pedidos del día solo para ordenar y cortar en cliente. Ver
 * [[API - Endpoint - GET reports-daily-orders]]. */
export const useRecentOrders = (limit = 8) => {
  return useQuery<DailyOrder[]>({
    queryKey: ['daily-orders', 'recent', limit],
    queryFn: () => reportsApi.getRecentOrders(limit),
    staleTime: 5 * 60 * 1000,
    retry: 3,
  })
}

/** Breakdown {estado, count} agregado en DB — evita traer todos los
 * pedidos del día solo para contar por estado en cliente. */
export const useDailyOrdersStatusBreakdown = () => {
  return useQuery<DailyOrdersStatusBreakdownItem[]>({
    queryKey: ['daily-orders', 'status-breakdown'],
    queryFn: reportsApi.getDailyOrdersStatusBreakdown,
    staleTime: 5 * 60 * 1000,
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

/** GROUP BY vendedor + SUM + ORDER BY en DB — ver
 * [[API - Endpoint - GET reports-vendors]]. */
export const useVendors = (date?: string, limit = 5) => {
  return useQuery<Vendor[]>({
    queryKey: ['vendors', date ?? 'all', limit],
    queryFn: () => reportsApi.getVendors(date, limit),
    staleTime: 5 * 60 * 1000, // 5 minutos
    retry: 3,
  })
}
