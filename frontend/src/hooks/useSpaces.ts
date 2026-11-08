import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  clearSpace,
  createSpace,
  deleteArticles,
  deleteSpace,
  fetchArticle,
  fetchEdgeSources,
  fetchExtractionSettings,
  fetchNodeSources,
  fetchSpaceArticles,
  fetchSpaceStats,
  fetchSpaces,
  renameSpace,
  reorderSpaces,
  saveExtractionSettings,
} from '../services/api'
import type { Space } from '../types'

export const SPACES_QUERY_KEY = ['spaces']

export function useSpaces() {
  return useQuery({ queryKey: SPACES_QUERY_KEY, queryFn: fetchSpaces })
}

const statsQuery = (spaceId: string) => ({
  queryKey: [...SPACES_QUERY_KEY, spaceId, 'stats'],
  queryFn: () => fetchSpaceStats(spaceId),
})

const articlesQuery = (spaceId: string) => ({
  queryKey: [...SPACES_QUERY_KEY, spaceId, 'articles'],
  queryFn: () => fetchSpaceArticles(spaceId),
})

export function useSpaceStats(spaceId: string) {
  return useQuery(statsQuery(spaceId))
}

export function useSpaceArticles(spaceId: string) {
  // An empty id means no space is picked yet.
  return useQuery({ ...articlesQuery(spaceId), enabled: spaceId !== '' })
}

export function usePrefetchSpace() {
  const queryClient = useQueryClient()
  return (spaceId: string) => {
    void queryClient.prefetchQuery(statsQuery(spaceId))
    void queryClient.prefetchQuery(articlesQuery(spaceId))
  }
}

export function useArticle(spaceId: string, articleId: string | null) {
  return useQuery({
    queryKey: [...SPACES_QUERY_KEY, spaceId, 'articles', articleId],
    queryFn: () => fetchArticle(spaceId, articleId!),
    enabled: articleId !== null,
  })
}

export function useNodeSources(spaceId: string, nodeId: string) {
  return useQuery({
    queryKey: [...SPACES_QUERY_KEY, spaceId, 'nodes', nodeId, 'sources'],
    queryFn: () => fetchNodeSources(spaceId, nodeId),
  })
}

export function useEdgeSources(spaceId: string, edgeId: string) {
  return useQuery({
    queryKey: [...SPACES_QUERY_KEY, spaceId, 'edges', edgeId, 'sources'],
    queryFn: () => fetchEdgeSources(spaceId, edgeId),
  })
}

const extractionSettingsKey = (spaceId: string) => [
  ...SPACES_QUERY_KEY,
  spaceId,
  'extraction-settings',
]

export function useExtractionSettings(spaceId: string) {
  return useQuery({
    queryKey: extractionSettingsKey(spaceId),
    queryFn: () => fetchExtractionSettings(spaceId),
  })
}

export function useSaveExtractionSettings(spaceId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (settings: Parameters<typeof saveExtractionSettings>[1]) =>
      saveExtractionSettings(spaceId, settings),
    onSuccess: (saved) => {
      queryClient.setQueryData(extractionSettingsKey(spaceId), saved)
      toast.success('Zapisano ustawienia ekstrakcji')
    },
    onError: (error) => toast.error(error.message),
  })
}

function useInvalidateSpaces() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: SPACES_QUERY_KEY })
}

export function useCreateSpace() {
  const onSuccess = useInvalidateSpaces()
  return useMutation({ mutationFn: createSpace, onSuccess })
}

export function useRenameSpace() {
  const onSuccess = useInvalidateSpaces()
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => renameSpace(id, name),
    onSuccess,
  })
}

export function useDeleteSpace() {
  const onSuccess = useInvalidateSpaces()
  return useMutation({ mutationFn: deleteSpace, onSuccess })
}

// The list takes the new order at once rather than jumping back until the refetch; only the
// list itself is refetched, since nothing else depends on the order.
export function useReorderSpaces() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: reorderSpaces,
    onMutate: async (spaceIds: string[]) => {
      await queryClient.cancelQueries({ queryKey: SPACES_QUERY_KEY, exact: true })
      queryClient.setQueryData<Space[]>(SPACES_QUERY_KEY, (spaces) =>
        spaces?.toSorted((a, b) => spaceIds.indexOf(a.id) - spaceIds.indexOf(b.id))
      )
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: SPACES_QUERY_KEY, exact: true }),
  })
}

// Stats and the space list depend on the article too, so the whole space is refetched.
export function useClearSpace(spaceId: string) {
  const onSuccess = useInvalidateSpaces()
  return useMutation({ mutationFn: () => clearSpace(spaceId), onSuccess })
}

export function useDeleteArticles(spaceId: string) {
  const onSuccess = useInvalidateSpaces()
  return useMutation({
    mutationFn: (articleIds: string[]) => deleteArticles(spaceId, articleIds),
    onSuccess,
  })
}
