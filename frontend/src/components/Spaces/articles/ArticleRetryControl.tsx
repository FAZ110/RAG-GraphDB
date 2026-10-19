import { RotateCwIcon } from 'lucide-react'
import { IconButton } from '@/components/deck'
import { useRetryArticles } from '@/hooks/useBatches'
import { cn } from '@/lib/utils'

export function ArticleRetryControl({
  spaceId,
  articleId,
}: {
  spaceId: string
  articleId: string
}) {
  const retry = useRetryArticles(spaceId)
  return (
    <IconButton
      variant="ghost"
      size="icon-sm"
      label={retry.error?.message ?? 'Ponów'}
      aria-label="Ponów artykuł"
      disabled={retry.isPending}
      onClick={() => retry.mutate([articleId])}
    >
      <RotateCwIcon className={cn(retry.isPending && 'animate-spin')} />
    </IconButton>
  )
}
