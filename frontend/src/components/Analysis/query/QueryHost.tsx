import { memo, useImperativeHandle } from 'react'
import type { Ref } from 'react'
import type { LoadedNode } from '@/types'
import type { QueryResult } from '@/types/query'
import { QueryModal } from './QueryModal'
import type { QueryScope } from './usePatternQuery'
import { usePatternQuery } from './usePatternQuery'

/** What the editor gets when an answer is taken to the canvas. */
export interface QueryAnswer {
  result: QueryResult
  /** The question's known entities, which its matches gather round. */
  known: string[]
  scope: QueryScope | null
}

export interface QueryHostHandle {
  /** Opens the question on these entities, or closes it when open. */
  toggle: (entities: readonly LoadedNode[]) => void
  open: (entities: readonly LoadedNode[]) => void
}

interface Props {
  ref: Ref<QueryHostHandle>
  spaceId: string
  /** The analysis's entities, which answers can be kept to; keep the array stable. */
  canvas?: readonly string[]
  onOpenChange: (open: boolean) => void
  onShow: (answer: QueryAnswer) => void
  onOpenArticle: (articleId: string) => void
}

/**
 * The question's own state, apart from the editor: drawing it re-renders the modal alone, not
 * the canvas behind it. Its props must stay the same between the editor's renders.
 */
export const QueryHost = memo(function QueryHost({
  ref,
  spaceId,
  canvas,
  onOpenChange,
  onShow,
  onOpenArticle,
}: Props) {
  const query = usePatternQuery(spaceId, canvas)
  const close = () => {
    query.close()
    onOpenChange(false)
  }
  const open = (entities: readonly LoadedNode[]) => {
    query.open(entities)
    onOpenChange(true)
  }
  useImperativeHandle(ref, () => ({
    toggle: (entities) => (query.pattern ? close() : open(entities)),
    open: (entities) => {
      if (!query.pattern) open(entities)
    },
  }))
  return (
    <QueryModal
      spaceId={spaceId}
      query={query}
      onOpenArticle={onOpenArticle}
      onShow={(result) => {
        const known = query.pattern?.nodes.flatMap((n) => n.known?.map((e) => e.id) ?? []) ?? []
        const scope = query.scope
        close()
        onShow({ result, known, scope })
      }}
      onClose={close}
    />
  )
})
