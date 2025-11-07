import { useQuery } from '@tanstack/react-query'
import { companiesApi } from '@/api/companies'
import { Company } from '@/api/types'

export const useCompanies = () => {
  return useQuery<Company[]>({
    queryKey: ['companies'],
    queryFn: companiesApi.getAll,
    staleTime: 5 * 60 * 1000,
    retry: 3,
  })
}

export const useCompany = (id: number) => {
  return useQuery<Company>({
    queryKey: ['company', id],
    queryFn: () => companiesApi.getById(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  })
}

export const useCompaniesByYear = (year: number) => {
  return useQuery<Company[]>({
    queryKey: ['companies', 'year', year],
    queryFn: () => companiesApi.getByYear(year),
    enabled: !!year,
    staleTime: 5 * 60 * 1000,
  })
}
