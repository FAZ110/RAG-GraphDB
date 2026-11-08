import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { Query } from '@tanstack/react-query'
import { SPACES_QUERY_KEY } from '@/hooks/useSpaces'
import {
  createEdge,
  createNode,
  deleteEdge,
  deleteNode,
  mergeNodes,
  updateEdge,
  updateNode,
} from '@/services/api'
import type { NodeFields, OverviewResponse } from '@/types'
import { removeEdge, removeNode, upsertEdge, upsertNode } from './overviewEdits'
import { overviewKey } from './useGraphOverview'

/** The graph edits of the old view, mirrored into the map's data instead of refetching it. */
export function useMapEdits(spaceId: string) {
  const queryClient = useQueryClient()
  const key = overviewKey(spaceId)
  const patch = (update: (data: OverviewResponse) => OverviewResponse) =>
    queryClient.setQueryData<OverviewResponse>(key, (data) => data && update(data))
  const notOverview = (q: Query) => q.queryKey[2] !== key[2]
  const refreshAnalysis = () => queryClient.invalidateQueries({ queryKey: ['analysis', spaceId] })
  const onSettled = () => {
    void refreshAnalysis()
    return queryClient.invalidateQueries({ queryKey: SPACES_QUERY_KEY, predicate: notOverview })
  }

  const addNode = useMutation({
    mutationFn: (fields: NodeFields) => createNode(spaceId, fields),
    onSuccess: (node) => patch((d) => upsertNode(d, node)),
    onSettled,
  })

  const editNode = useMutation({
    mutationFn: ({ id, fields }: { id: string; fields: Partial<NodeFields> }) =>
      updateNode(spaceId, id, fields),
    onSuccess: (node) => patch((d) => upsertNode(d, node)),
    onSettled,
  })

  const removeNodeMutation = useMutation({
    mutationFn: (id: string) => deleteNode(spaceId, id),
    onSuccess: (_, id) => patch((d) => removeNode(d, id)),
    onSettled,
  })

  const merge = useMutation({
    mutationFn: ({ keepId, mergeId }: { keepId: string; mergeId: string }) =>
      mergeNodes(spaceId, keepId, mergeId),
    onSettled: () => {
      void refreshAnalysis()
      return queryClient.invalidateQueries({ queryKey: SPACES_QUERY_KEY })
    },
  })

  const addEdge = useMutation({
    mutationFn: ({ source, target, type }: { source: string; target: string; type: string }) =>
      createEdge(spaceId, source, target, type),
    onSuccess: (edge) => patch((d) => upsertEdge(d, edge)),
    onSettled,
  })

  const editEdge = useMutation({
    mutationFn: ({ id, type }: { id: string; type: string }) => updateEdge(spaceId, id, type),
    onSuccess: (edge, { id }) => patch((d) => upsertEdge(d, edge, id)),
    onSettled,
  })

  const removeEdgeMutation = useMutation({
    mutationFn: (id: string) => deleteEdge(spaceId, id),
    onSuccess: (_, id) => patch((d) => removeEdge(d, id)),
    onSettled,
  })

  return {
    addNode,
    editNode,
    removeNode: removeNodeMutation,
    merge,
    addEdge,
    editEdge,
    removeEdge: removeEdgeMutation,
  }
}

export type MapEdits = ReturnType<typeof useMapEdits>
