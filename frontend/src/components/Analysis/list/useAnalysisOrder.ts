import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { reorderAnalyses } from '@/services/analyses'
import type { AnalysisListItem } from '@/types/analysis'

const ALL = ['analyses', 'all']

/** `shown` rearranged into the slots `all` gives them, so a filtered view keeps the others put. */
function merged(all: readonly string[], shown: readonly string[]): string[] {
  const moved = new Set(shown)
  let next = 0
  return all.map((id) => (moved.has(id) ? shown[next++] : id))
}

/** Cards dragged into a new order; the order shows at once and is saved when dropped. */
export function useAnalysisOrder(all: AnalysisListItem[], shown: AnalysisListItem[]) {
  const queryClient = useQueryClient()
  const [order, setOrder] = useState<string[] | null>(null)
  const save = useMutation({
    mutationFn: reorderAnalyses,
    onMutate: async (ids: string[]) => {
      await queryClient.cancelQueries({ queryKey: ALL })
      queryClient.setQueryData<AnalysisListItem[]>(ALL, (list) =>
        list?.toSorted((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id))
      )
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['analyses'] }),
  })
  const byId = new Map(shown.map((a) => [a.id, a]))
  const ordered = order ? order.flatMap((id) => byId.get(id) ?? []) : shown

  return {
    ordered,
    /** Move `id` into the slot `target` holds. */
    moveTo: (id: string, target: string) => {
      const ids = ordered.map((a) => a.id)
      const to = ids.indexOf(target)
      if (to === -1 || ids[to] === id) return
      setOrder(ids.filter((x) => x !== id).toSpliced(to, 0, id))
    },
    drop: () => {
      if (order && order.some((id, i) => id !== shown[i]?.id)) {
        save.mutate(
          merged(
            all.map((a) => a.id),
            order
          ),
          { onSettled: () => setOrder(null) }
        )
      } else {
        setOrder(null)
      }
    },
  }
}
