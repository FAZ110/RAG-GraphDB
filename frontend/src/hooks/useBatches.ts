import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { QueryClient } from '@tanstack/react-query'
import { fetchLatestBatch, fetchRunningBatches, submitExtract } from '../services/api'
import type { ArticleRequest, Batch } from '../types'
import { SPACES_QUERY_KEY } from './useSpaces'

export const BATCHES_QUERY_KEY = ['batches']

export const isRunning = (batch: Batch) => batch.pending + batch.processing > 0

export function useLatestBatch(spaceId: string) {
  return useQuery({
    queryKey: [...BATCHES_QUERY_KEY, 'latest', spaceId],
    queryFn: () => fetchLatestBatch(spaceId),
  })
}

export function useRunningBatches() {
  return useQuery({
    queryKey: [...BATCHES_QUERY_KEY, 'running'],
    queryFn: fetchRunningBatches,
  })
}

/** Uploads change the space list, the articles and their stats. */
export function refreshAfterUpload(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: SPACES_QUERY_KEY })
  queryClient.invalidateQueries({ queryKey: BATCHES_QUERY_KEY })
}

interface Upload {
  spaceId: string
  articles: ArticleRequest[]
  provider: string
}

/** Sends the whole upload at once; the server queues it, so it survives closing the page. */
export function useAddArticles() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ spaceId, articles, provider }: Upload) =>
      submitExtract(spaceId, { articles, provider }).then((r) => r.job_id),
    onSuccess: () => refreshAfterUpload(queryClient),
  })
}
