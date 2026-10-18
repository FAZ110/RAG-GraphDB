import { useState } from 'react'
import type { Article } from '@/types'

// Articles being extracted can't be deleted, and picks hidden by the search or gone since the
// refetch don't count.
export function useArticleSelection(shown: Article[]) {
  const [picked, setPicked] = useState<ReadonlySet<string>>(new Set())
  const selectable = shown.filter((a) => a.status !== 'processing')
  const selected = selectable.filter((a) => picked.has(a.id)).map((a) => a.id)

  return {
    selected,
    selectableCount: selectable.length,
    isPicked: (id: string) => picked.has(id),
    toggle: (id: string) =>
      setPicked((prev) => {
        const next = new Set(prev)
        if (!next.delete(id)) next.add(id)
        return next
      }),
    toggleAll: () =>
      setPicked(
        selected.length === selectable.length ? new Set() : new Set(selectable.map((a) => a.id))
      ),
    clear: () => setPicked(new Set()),
  }
}

export type ArticleSelection = ReturnType<typeof useArticleSelection>
