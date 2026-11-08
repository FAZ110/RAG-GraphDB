import type { CSSProperties } from 'react'
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
}: Props) {
  const [tableRef, table] = useElementSize<HTMLUListElement>()
  const rowRoom = table && table.height - 1 - ARTICLE_HEADER_HEIGHT
  const rowHeight = fitRowHeight(articles.length, rowRoom, ARTICLE_ROW_HEIGHT, 1)

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
          onToggle={() => selection.toggle(article.id)}
          onOpen={() => onOpen(article.id)}
        />
      ))}
      {articles.length === 0 && (
        <NoArticleMatch query={query.trim()} ink={ink} onClear={onClearQuery} />
      )}
    </ul>
  )
}
