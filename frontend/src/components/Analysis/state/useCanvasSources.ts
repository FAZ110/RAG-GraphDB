import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { fetchSources } from '@/services/analyses'

/** The articles behind what is on the canvas, each with which of its entities are there. */
export function useCanvasSources(spaceId: string, entityIds: readonly string[]) {
  const sorted = entityIds.toSorted()
  return useQuery({
    queryKey: ['analysis', spaceId, 'sources', sorted.join(',')],
    queryFn: () => fetchSources(spaceId, sorted),
    enabled: sorted.length > 0,
    placeholderData: keepPreviousData,
  })
}
