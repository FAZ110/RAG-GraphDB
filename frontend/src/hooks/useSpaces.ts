import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createSpace, deleteSpace, fetchSpaces, renameSpace } from '../services/api'

export const SPACES_QUERY_KEY = ['spaces']

export function useSpaces() {
  return useQuery({ queryKey: SPACES_QUERY_KEY, queryFn: fetchSpaces })
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
