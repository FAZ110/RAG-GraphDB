import type { ReactNode } from 'react'
import { RemoveControl } from '@/components/deck'
import { useDeleteArticles } from '@/hooks/useSpaces'
import type { Article } from '@/types'

interface Props {
  spaceId: string
  article: Article
  leading?: ReactNode
}

// Where the pointer can hover, the actions slide in over the date on hover or keyboard focus;
// elsewhere they keep a column of their own.
const actions =
  'flex items-center gap-1 transition-[opacity,translate] duration-150 motion-reduce:transition-none pointer-coarse:col-start-[-2] pointer-coarse:row-start-1 pointer-coarse:justify-self-end pointer-fine:absolute pointer-fine:inset-y-0 pointer-fine:right-2 pointer-fine:translate-x-2 pointer-fine:bg-surface-sunken pointer-fine:pl-2 pointer-fine:opacity-0 pointer-fine:group-focus-within:translate-x-0 pointer-fine:group-focus-within:opacity-100 pointer-fine:group-hover:translate-x-0 pointer-fine:group-hover:opacity-100'

export function ArticleDeleteControl({ spaceId, article, leading }: Props) {
  const remove = useDeleteArticles(spaceId)
  return (
    <RemoveControl
      label="Usuń artykuł"
      question="Usunąć artykuł i jego encje z grafu?"
      blockedBy={article.status === 'processing' ? 'Artykuł jest właśnie przetwarzany' : undefined}
      pending={remove.isPending}
      error={remove.error?.message ?? null}
      onOpen={remove.reset}
      onConfirm={(done) => remove.mutate([article.id], { onSuccess: done })}
      leading={leading}
      groupClassName={actions}
      // The question covers the row from the title on, or from the status column once it shows.
      confirmClassName="inset-y-0 -right-2 left-0 col-start-3 -col-end-1 @3xl:col-start-4"
    />
  )
}
