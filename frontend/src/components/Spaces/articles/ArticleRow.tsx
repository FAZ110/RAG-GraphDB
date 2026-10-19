import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Checkbox, ErrorNote, HighlightedText, Swatch } from '@/components/deck'
import { unfold } from '@/design/motion'
import { cn } from '@/lib/utils'
import type { Article } from '@/types'
import { formatDate } from '../spaceText'
import { ArticleDeleteControl } from './ArticleDeleteControl'
import { ArticleRetryControl } from './ArticleRetryControl'
import { ARTICLE_GRID } from './articleGrid'
import { sourceHost } from './articleSource'
import { ARTICLE_STATUS } from './articleStatus'
import { ArticleStatusCell } from './ArticleStatusCell'

interface Props {
  spaceId: string
  article: Article
  selected: boolean
  onToggle: () => void
  onOpen: () => void
  needle: string
}

export function ArticleRow({ spaceId, article, selected, onToggle, onOpen, needle }: Props) {
  const [showError, setShowError] = useState(false)
  const status = ARTICLE_STATUS[article.status]
  const title = article.title || article.url || 'Artykuł bez tytułu'

  return (
    <li className={cn('snap-start border-b border-line-soft', selected && 'bg-surface-sunken')}>
      <div
        className={cn(
          ARTICLE_GRID,
          'group relative h-[calc(var(--article-row)-1px)] hover:bg-surface-sunken'
        )}
      >
        <Checkbox
          aria-label={`Zaznacz: ${title}`}
          checked={selected}
          disabled={article.status === 'processing'}
          onChange={onToggle}
        />
        <Swatch
          color={status.color}
          label={status.label}
          className={cn('size-3', article.status === 'processing' && 'animate-pulse')}
        />
        <div className="min-w-0">
          <button
            type="button"
            onClick={onOpen}
            className="block max-w-full truncate text-left leading-6 font-medium text-fg hover:underline focus-visible:ring-2 focus-visible:ring-fg focus-visible:outline-none"
          >
            <HighlightedText text={title} needle={needle} />
          </button>
          <p className="truncate text-sm leading-5 text-fg-subtle">
            <HighlightedText text={sourceHost(article.url)} needle={needle} />
          </p>
        </div>
        <ArticleStatusCell
          article={article}
          showError={showError}
          onShowErrorChange={setShowError}
        />
        <span className="hidden text-sm text-fg-muted tabular-nums @3xl:block">
          {article.nodes_count ?? '–'}
        </span>
        <span className="hidden text-sm text-fg-subtle transition-opacity pointer-fine:group-focus-within:opacity-0 pointer-fine:group-hover:opacity-0 @md:block">
          {formatDate(article.processed_at ?? article.created_at)}
        </span>
        <ArticleDeleteControl
          spaceId={spaceId}
          article={article}
          leading={
            article.status === 'error' && (
              <ArticleRetryControl spaceId={spaceId} articleId={article.id} />
            )
          }
        />
      </div>
      <AnimatePresence initial={false}>
        {article.status === 'error' && showError && (
          <motion.div {...unfold} className="overflow-hidden">
            <ErrorNote className="mx-4 mb-3">{article.error}</ErrorNote>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  )
}
