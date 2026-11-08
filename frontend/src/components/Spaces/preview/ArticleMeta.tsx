import type { ComponentProps } from 'react'
import { Swatch } from '@/components/deck'
import { cn } from '@/lib/utils'
import type { ArticleDetail } from '@/types'
import { sourceHost } from '../articles/articleSource'
import { ARTICLE_STATUS } from '../articles/articleStatus'
import { formatDate } from '../spaceText'

interface Props extends ComponentProps<'p'> {
  article: ArticleDetail
}

export function ArticleMeta({ article, className, ...props }: Props) {
  const status = ARTICLE_STATUS[article.status]
  return (
    <p
      className={cn(
        'flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-fg-subtle',
        className
      )}
      {...props}
    >
      <span className="flex items-center gap-1.5">
        <Swatch color={status.color} />
        {status.label}
      </span>
      <span>{sourceHost(article.url)}</span>
      <span>Dodano {formatDate(article.created_at)}</span>
    </p>
  )
}
