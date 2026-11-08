import { useQuery } from '@tanstack/react-query'
import { fetchAuthConfig } from '@/services/auth'

export function useRegistrationOpen() {
  const config = useQuery({ queryKey: ['auth', 'config'], queryFn: fetchAuthConfig })
  return config.data?.registration_open ?? false
}
