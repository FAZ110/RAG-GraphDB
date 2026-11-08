import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createCustomProvider,
  deleteCustomProvider,
  fetchCustomProviders,
  updateCustomProvider,
} from '../services/api'
import { toast } from 'sonner'
import type { CustomProviderInput } from '../types'

const CUSTOM_PROVIDERS_KEY = ['settings', 'providers']

export function useCustomProviders() {
  return useQuery({ queryKey: CUSTOM_PROVIDERS_KEY, queryFn: fetchCustomProviders })
}

function useInvalidateProviders() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: CUSTOM_PROVIDERS_KEY })
}

export function useSaveCustomProvider(id: string | null) {
  const onSuccess = useInvalidateProviders()
  return useMutation({
    mutationFn: (provider: CustomProviderInput) =>
      id ? updateCustomProvider(id, provider) : createCustomProvider(provider),
    onSuccess: () => {
      toast.success(id ? 'Zapisano model' : 'Dodano model')
      return onSuccess()
    },
    onError: (error) => toast.error(error.message),
  })
}

export function useDeleteCustomProvider() {
  const onSuccess = useInvalidateProviders()
  return useMutation({
    mutationFn: deleteCustomProvider,
    onSuccess: () => {
      toast.success('Usunięto model')
      return onSuccess()
    },
    onError: (error) => toast.error(error.message),
  })
}
