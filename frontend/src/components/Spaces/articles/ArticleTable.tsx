import { useCallback, useLayoutEffect, useRef } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { surface } from '@/components/deck'
import { useElementSize } from '@/hooks/useElementSize'
import type { Ink } from '@/design/inks'
import { cn } from '@/lib/utils'
import type { Article } from '@/types'
import { fitRowHeight } from '../fitRows'
import { ARTICLE_HEADER_HEIGHT, ARTICLE_ROW_HEIGHT } from './articleGrid'
import { ArticleListHeader } from './ArticleListHeader'
import { ArticleRow } from './ArticleRow'
import { NoArticleMatch } from './NoArticleMatch'
import type { ArticleSelection } from './useArticleSelection'

interface Props {
  spaceId: string
  ink: Ink
  articles: Article[]
  needle: string
  query: string
  onClearQuery: () => void
  selection: ArticleSelection
  onOpen: (articleId: string) => void
  onDeleteSelected: () => void
  footer?: ReactNode
}

export function ArticleTable({
  spaceId,
  ink,
  articles,
  needle,
  query,
  onClearQuery,
  selection,
  onOpen,
  onDeleteSelected,
  footer,
}: Props) {
  const [tableRef, table] = useElementSize<HTMLUListElement>()
  const rowRoom = table && table.height - ARTICLE_HEADER_HEIGHT
  const rowHeight = fitRowHeight(articles.length, rowRoom, ARTICLE_ROW_HEIGHT, 1)
  const latestOpen = useRef(onOpen)
  useLayoutEffect(() => {
    latestOpen.current = onOpen
  })
  const openRow = useCallback((id: string) => latestOpen.current(id), [])

  return (
    <div className={cn(surface, 'flex h-full flex-col', !footer && 'border-b-0')}>
      <ul
        ref={tableRef}
        style={{ '--article-row': `${rowHeight}px` } as CSSProperties}
        className="@container min-h-0 flex-1 snap-y snap-mandatory scroll-pt-11 overflow-x-hidden overflow-y-auto"
      >
        <ArticleListHeader
          ink={ink}
          selected={selection.selected.length}
          selectable={selection.selectableCount}
          onToggleAll={selection.toggleAll}
          onDeleteSelected={onDeleteSelected}
        />
        {articles.map((article) => (
          <ArticleRow
            key={article.id}
            spaceId={spaceId}
            article={article}
            needle={needle}
            selected={selection.isPicked(article.id)}
            onToggle={selection.toggle}
            onOpen={openRow}
          />
        ))}
        {articles.length === 0 && (
          <NoArticleMatch query={query.trim()} ink={ink} onClear={onClearQuery} />
        )}
      </ul>
      {footer}
    </div>
  )
}
