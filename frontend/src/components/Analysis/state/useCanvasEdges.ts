import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { fetchSubgraph } from '@/services/analyses'

/** The relations among what is on the canvas, with the entities' current degrees. */
export function useCanvasEdges(spaceId: string, ids: readonly string[]) {
  const sorted = ids.toSorted()
  return useQuery({
    queryKey: ['analysis', spaceId, 'subgraph', sorted.join(',')],
    queryFn: () => fetchSubgraph(spaceId, sorted),
    enabled: sorted.length > 0,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  })
}
