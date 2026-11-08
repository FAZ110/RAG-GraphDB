import { useQuery } from '@tanstack/react-query'
import { SPACES_QUERY_KEY } from '@/hooks/useSpaces'
import { fetchGraphOverview } from '@/services/api'

export const overviewKey = (spaceId: string) => [...SPACES_QUERY_KEY, spaceId, 'overview']

export function useGraphOverview(spaceId: string) {
  return useQuery({
    queryKey: overviewKey(spaceId),
    queryFn: () => fetchGraphOverview(spaceId),
  })
}
