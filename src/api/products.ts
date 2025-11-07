import { apiClient } from './client'
import { Product, ProductsResponse } from './types'
import { withRetry } from '@/utils/retry'

export const productsApi = {
  getAll: async (): Promise<Product[]> => {
    return withRetry(async () => {
      const response = await apiClient.get<ProductsResponse>('/products')
      return response.data.data
    })
  },

  getById: async (id: number): Promise<Product> => {
    return withRetry(async () => {
      const response = await apiClient.get<{ success: boolean; data: Product }>(
        `/products/${id}`
      )
      return response.data.data
    })
  },

  getByCategory: async (category: string): Promise<Product[]> => {
    return withRetry(async () => {
      const response = await apiClient.get<ProductsResponse>(
        `/products/category/${category}`
      )
      return response.data.data
    })
  },

  getByIndicator: async (
    indicator: 'compra' | 'venta' | 'manufactura'
  ): Promise<Product[]> => {
    return withRetry(async () => {
      const response = await apiClient.get<ProductsResponse>(
        `/products/indicator/${indicator}`
      )
      return response.data.data
    })
  },
}
