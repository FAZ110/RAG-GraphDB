import { useAuth } from '@/components/auth/authContext'
import { useCustomProviders } from '@/hooks/useSettings'
import { customProvider, DEFAULT_PROVIDER } from '@/lib/providers'
import type { Provider } from '@/lib/providers'

/** The model to use unless one is picked: the server's when the admin granted it, else the
 * user's first own model; null when the user can use none. */
export function useDefaultProvider(): Provider | null {
  const { user } = useAuth()
  const firstCustom = useCustomProviders().data?.[0]
  if (user.server_models) return DEFAULT_PROVIDER
  return firstCustom ? customProvider(firstCustom.id) : null
}
