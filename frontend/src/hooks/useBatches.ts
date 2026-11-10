import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { QueryClient } from '@tanstack/react-query'
import {
  changeBatch,
  fetchLatestBatch,
  fetchRunningBatches,
  retryArticles,
  submitExtract,
} from '../services/api'
import type { BatchAction, RetryStatus } from '../services/api'
import type { ArticleRequest, Batch } from '../types'
import { SPACES_QUERY_KEY } from './useSpaces'

export const BATCHES_QUERY_KEY = ['batches']

export const isRunning = (batch: Batch) => batch.pending + batch.processing > 0
export const isPaused = (batch: Batch) => !isRunning(batch) && batch.paused > 0

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

export const RETRY_MUTATION_KEY = ['retry-articles']

/** Queues failed (or cancelled) articles again as a new upload. */
export function useRetryArticles(spaceId: string, status: RetryStatus = 'error') {
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey: RETRY_MUTATION_KEY,
    mutationFn: (articleIds: string[]) => retryArticles(spaceId, articleIds, status),
    // Stays pending until both lists are fresh, so a page can wait and show them in one step.
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: SPACES_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: BATCHES_QUERY_KEY }),
      ]),
  })
}

export function useBatchAction(batch: Batch) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (action: BatchAction) => changeBatch(batch.space_id, batch.id, action),
    onSuccess: () => refreshAfterUpload(queryClient),
  })
}
