import type { CSSProperties } from 'react'
import { surface } from '@/components/deck'
import { useElementSize } from '@/hooks/useElementSize'
import { cn } from '@/lib/utils'
import type { Article } from '@/types'
import { fitRowHeight } from '../fitRows'
import { ARTICLE_HEADER_HEIGHT, ARTICLE_ROW_HEIGHT } from './articleGrid'
import { ArticleListHeader } from './ArticleListHeader'
import { ArticleRow } from './ArticleRow'
import type { ArticleSelection } from './useArticleSelection'

interface Props {
  spaceId: string
  articles: Article[]
  needle: string
  query: string
  selection: ArticleSelection
  onOpen: (articleId: string) => void
  onDeleteSelected: () => void
}

export function ArticleTable({
  spaceId,
  articles,
  needle,
  query,
  selection,
  onOpen,
  onDeleteSelected,
}: Props) {
  const [tableRef, table] = useElementSize<HTMLUListElement>()
  const rowRoom = table && table.height - 1 - ARTICLE_HEADER_HEIGHT
  const rowHeight = fitRowHeight(articles.length, rowRoom, ARTICLE_ROW_HEIGHT)

  return (
    <ul
      ref={tableRef}
      style={{ '--article-row': `${rowHeight}px` } as CSSProperties}
      className={cn(
        surface,
        '@container h-full snap-y snap-mandatory scroll-pt-11 overflow-y-auto border-b-0'
      )}
    >
      <ArticleListHeader
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
          onToggle={() => selection.toggle(article.id)}
          onOpen={() => onOpen(article.id)}
        />
      ))}
      {articles.length === 0 && (
        <li className="px-4 py-5 text-sm text-fg-muted">
          Żaden artykuł nie pasuje do „{query.trim()}”.
        </li>
      )}
    </ul>
  )
}
