import { useQuery } from '@tanstack/react-query'
import { clientsApi } from '@/api/clients'
import { Client, ClientsActivosResponse } from '@/api/types'

// /clients trae ~10.8k registros sin paginar. Igual que useProducts,
// alargamos staleTime/gcTime para no repetir la descarga pesada en cada
// navegación — el fix real es que backend pagine este endpoint.
export const useClients = () => {
  return useQuery<Client[]>({
    queryKey: ['clients'],
    queryFn: clientsApi.getAll,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: 3,
  })
}

/** Usa GET /clients/count (agregado en DB) en vez de traer el listado
 * completo solo para contar — ver [[API - Endpoint - GET clients-count]]. */
export const useClientsCount = () => {
  return useQuery<number>({
    queryKey: ['clients', 'count'],
    queryFn: clientsApi.getCount,
    staleTime: 5 * 60 * 1000,
    retry: 3,
  })
}

export const useClient = (id: number) => {
  return useQuery<Client>({
    queryKey: ['client', id],
    queryFn: () => clientsApi.getById(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  })
}

export const useClientsSearch = (query: string) => {
  return useQuery<Client[]>({
    queryKey: ['clients', 'search', query],
    queryFn: () => clientsApi.search(query),
    enabled: query.length > 2,
    staleTime: 2 * 60 * 1000,
  })
}

export const useClientsActivos = () => {
  return useQuery<ClientsActivosResponse['data']>({
    queryKey: ['clients', 'activos'],
    queryFn: clientsApi.getActivos,
    staleTime: 5 * 60 * 1000,
    retry: 3,
  })
}
