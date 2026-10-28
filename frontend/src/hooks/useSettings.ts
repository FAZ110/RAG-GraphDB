import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { deleteCustomProvider, fetchCustomProvider, saveCustomProvider } from '../services/api'

const CUSTOM_PROVIDER_KEY = ['settings', 'custom-provider']

export function useCustomProvider() {
  return useQuery({ queryKey: CUSTOM_PROVIDER_KEY, queryFn: fetchCustomProvider })
}

export function useSaveCustomProvider() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: saveCustomProvider,
    onSuccess: (saved) => queryClient.setQueryData(CUSTOM_PROVIDER_KEY, saved),
  })
}

export function useDeleteCustomProvider() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteCustomProvider,
    onSuccess: () => queryClient.setQueryData(CUSTOM_PROVIDER_KEY, null),
  })
}
