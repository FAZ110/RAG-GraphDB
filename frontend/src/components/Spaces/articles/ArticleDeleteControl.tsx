import { RemoveControl } from '@/components/deck'
import { useDeleteArticles } from '@/hooks/useSpaces'
import type { Article } from '@/types'

interface Props {
  spaceId: string
  article: Article
}

export function ArticleDeleteControl({ spaceId, article }: Props) {
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
      // The question covers the row from the title on, or from the status column once it shows.
      confirmClassName="inset-y-0 -right-2 left-0 col-start-3 -col-end-1 @3xl:col-start-4"
    />
  )
}
