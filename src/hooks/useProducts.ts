import { useQuery } from '@tanstack/react-query'
import { productsApi } from '@/api/products'
import { Product } from '@/api/types'

export const useProducts = () => {
  return useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: productsApi.getAll,
    staleTime: 5 * 60 * 1000,
    retry: 3,
  })
}

export const useProduct = (id: number) => {
  return useQuery<Product>({
    queryKey: ['product', id],
    queryFn: () => productsApi.getById(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  })
}

export const useProductsByCategory = (category: string) => {
  return useQuery<Product[]>({
    queryKey: ['products', 'category', category],
    queryFn: () => productsApi.getByCategory(category),
    enabled: !!category,
    staleTime: 5 * 60 * 1000,
  })
}

export const useProductsByIndicator = (
  indicator: 'compra' | 'venta' | 'manufactura'
) => {
  return useQuery<Product[]>({
    queryKey: ['products', 'indicator', indicator],
    queryFn: () => productsApi.getByIndicator(indicator),
    enabled: !!indicator,
    staleTime: 5 * 60 * 1000,
  })
}
