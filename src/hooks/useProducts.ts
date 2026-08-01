import { useQuery } from '@tanstack/react-query'
import { productsApi } from '@/api/products'
import { Product } from '@/api/types'

// /products devuelve el catálogo completo sin paginar (~20MB, ~6s en la
// red). No hay endpoint paginado ni de conteo en backend todavía (ver
// docs/rendimiento-catalogos.md), así que lo único que el front puede
// hacer es evitar volver a pedirlo: staleTime/gcTime largos para que la
// descarga pesada ocurra una sola vez por sesión en vez de en cada
// navegación a Productos o cada 5 minutos.
export const useProducts = () => {
  return useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: productsApi.getAll,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: 3,
  })
}

/** Igual que useProducts pero solo expone el conteo — evita que un
 * componente que solo necesita el total (ej. KPI del dashboard) vuelva a
 * renderizar cuando cambian los productos individuales. No reduce la
 * descarga de red (React Query igual trae el array completo una vez),
 * solo evita trabajo de render redundante. */
export const useProductsCount = () => {
  return useQuery<Product[], Error, number>({
    queryKey: ['products'],
    queryFn: productsApi.getAll,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: 3,
    select: (data) => data.length,
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
