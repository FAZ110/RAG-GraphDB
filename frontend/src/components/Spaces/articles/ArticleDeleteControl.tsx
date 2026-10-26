import type { ReactNode } from 'react'
import { RemoveControl } from '@/components/deck'
import { useDeleteArticles } from '@/hooks/useSpaces'
import type { Article } from '@/types'

interface Props {
  spaceId: string
  article: Article
  leading?: ReactNode
}

const actions =
  'col-start-[-2] row-start-1 flex items-center justify-self-end gap-1 transition-opacity duration-150 motion-reduce:transition-none pointer-fine:opacity-0 pointer-fine:group-focus-within:opacity-100 pointer-fine:group-hover:opacity-100 pointer-fine:has-data-[state=open]:opacity-100'

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
    />
  )
}
