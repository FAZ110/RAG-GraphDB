import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createEdge,
  createNode,
  deleteEdge,
  deleteNode,
  mergeNodes,
  updateEdge,
  updateNode,
} from '../../../services/api';
import { SPACES_QUERY_KEY } from '../../../hooks/useSpaces';
import type { NodeFields } from '../../../types';
import {
  applyMerge,
  removeEdge,
  removeNode,
  upsertEdge,
  upsertNode,
} from '../utils/graphExpansion';
import type { GraphState } from '../utils/graphExpansion';

type ApplyEdit = (
  update: (prev: GraphState) => GraphState,
  totalDelta?: number,
  refetch?: string[],
) => void;

/** Saves manual graph edits and mirrors each into the loaded graph once saved. */
export function useGraphEdits(spaceId: string, applyEdit: ApplyEdit) {
  const queryClient = useQueryClient();
  // Stats, entity counts and sources all hang off the space's queries.
  const onSettled = () => queryClient.invalidateQueries({ queryKey: SPACES_QUERY_KEY });

  const addNode = useMutation({
    mutationFn: (fields: NodeFields) => createNode(spaceId, fields),
    onSuccess: (node) => applyEdit((s) => upsertNode(s, node), 1),
    onSettled,
  });

  const editNode = useMutation({
    mutationFn: ({ id, fields }: { id: string; fields: Partial<NodeFields> }) =>
      updateNode(spaceId, id, fields),
    onSuccess: (node) => applyEdit((s) => upsertNode(s, node)),
    onSettled,
  });

  const removeNodeMutation = useMutation({
    mutationFn: (id: string) => deleteNode(spaceId, id),
    onSuccess: (_, id) => applyEdit((s) => removeNode(s, id), -1),
    onSettled,
  });

  const merge = useMutation({
    mutationFn: ({ keepId, mergeId }: { keepId: string; mergeId: string }) =>
      mergeNodes(spaceId, keepId, mergeId),
    onSuccess: (kept, { keepId, mergeId }) =>
      applyEdit((s) => applyMerge(s, mergeId, kept), -1, [keepId]),
    onSettled,
  });

  const addEdge = useMutation({
    mutationFn: ({ source, target, type }: { source: string; target: string; type: string }) =>
      createEdge(spaceId, source, target, type),
    onSuccess: (edge) => applyEdit((s) => upsertEdge(s, edge), 0, [edge.source, edge.target]),
    onSettled,
  });

  const editEdge = useMutation({
    mutationFn: ({ id, type }: { id: string; type: string }) => updateEdge(spaceId, id, type),
    onSuccess: (edge, { id }) => applyEdit((s) => upsertEdge(s, edge, id)),
    onSettled,
  });

  const removeEdgeMutation = useMutation({
    mutationFn: (id: string) => deleteEdge(spaceId, id),
    onSuccess: (_, id) => applyEdit((s) => removeEdge(s, id)),
    onSettled,
  });

  return {
    addNode,
    editNode,
    removeNode: removeNodeMutation,
    merge,
    addEdge,
    editEdge,
    removeEdge: removeEdgeMutation,
  };
}

export type GraphEdits = ReturnType<typeof useGraphEdits>;
