import { apiClient } from './client'
import { Product, ProductsResponse } from './types'

// Sin withRetry a propósito: los hooks (useProducts, etc.) ya usan
// retry:3 de React Query. Ver comentario en clients.ts — acá aplica igual
// y products es el listado más grande de la app (miles de items sin paginar).
export const productsApi = {
  getAll: async (): Promise<Product[]> => {
    const response = await apiClient.get<ProductsResponse>('/products')
    return response.data.data
  },

  getById: async (id: number): Promise<Product> => {
    const response = await apiClient.get<{ success: boolean; data: Product }>(
      `/products/${id}`
    )
    return response.data.data
  },

  getByCategory: async (category: string): Promise<Product[]> => {
    const response = await apiClient.get<ProductsResponse>(
      `/products/category/${category}`
    )
    return response.data.data
  },

  getByIndicator: async (
    indicator: 'compra' | 'venta' | 'manufactura'
  ): Promise<Product[]> => {
    const response = await apiClient.get<ProductsResponse>(
      `/products/indicator/${indicator}`
    )
    return response.data.data
  },
}
