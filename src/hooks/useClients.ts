import { useQuery } from '@tanstack/react-query'
import { clientsApi } from '@/api/clients'
import { Client, ClientsActivosResponse } from '@/api/types'

export const useClients = () => {
  return useQuery<Client[]>({
    queryKey: ['clients'],
    queryFn: clientsApi.getAll,
    staleTime: 5 * 60 * 1000, // 5 minutos
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
