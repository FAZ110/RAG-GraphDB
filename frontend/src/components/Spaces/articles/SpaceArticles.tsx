import { useState } from 'react'
import { surface } from '@/components/deck'
import type { Ink } from '@/design/inks'
import { useSpaceArticles } from '@/hooks/useSpaces'
import { normalize } from '@/lib/text'
import { cn } from '@/lib/utils'
import { BatchSummary } from '../batches/BatchSummary'
import { RetryFailedButton } from '../batches/RetryFailedButton'
import { useRecentBatch } from '../batches/useRecentBatch'
import { ArticlePreview } from '../preview/ArticlePreview'
import { useArticlePreview } from '../preview/useArticlePreview'
import { filterArticles } from '../spaceSearch'
import { ArticlesTabs } from './ArticlesTabs'
import { ArticlesToolbar } from './ArticlesToolbar'
import { ArticleTable } from './ArticleTable'
import { DeleteArticlesDialog } from './DeleteArticlesDialog'
import { EmptyArticles } from './EmptyArticles'
import { useArticleSelection } from './useArticleSelection'

interface Props {
  spaceId: string
  ink: Ink
}

export function SpaceArticles({ spaceId, ink }: Props) {
  const articles = useSpaceArticles(spaceId)
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const preview = useArticlePreview()
  const recent = useRecentBatch(spaceId)

  const all = articles.data ?? []
  const inTab = recent.tab === 'recent' ? all.filter((a) => a.batch_id === recent.batch?.id) : all
  const needle = normalize(query.trim())
  const shown = filterArticles(inTab, needle)
  const selection = useArticleSelection(shown)

  return (
    <section className="flex min-h-56 flex-1 flex-col gap-3">
      <ArticlesToolbar
        spaceId={spaceId}
        title={
          <ArticlesTabs
            total={all.length}
            recent={recent.batch}
            tab={recent.tab}
            onTabChange={recent.setTab}
            onCloseRecent={recent.close}
          />
        }
        extraActions={
          <RetryFailedButton
            spaceId={spaceId}
            articleIds={inTab.filter((a) => a.status === 'error').map((a) => a.id)}
          />
        }
        hasArticles={all.length > 0}
        query={query}
        onQueryChange={setQuery}
        searching={searching}
        onSearchingChange={setSearching}
        status={`${shown.length} z ${inTab.length}`}
      />
      {articles.data?.length === 0 ? (
        <EmptyArticles spaceId={spaceId} ink={ink} />
      ) : (
        // Padding leaves room for the table's offset shadow.
        <div className="relative flex min-h-0 flex-1 flex-col pb-2">
          <div
            // Keyed, so each tab fits its own rows and keeps its own open errors.
            key={recent.tab}
            className="flex min-h-0 flex-1 flex-col"
          >
            {recent.tab === 'recent' && recent.batch && (
              <div className={cn(surface, 'border-b-0')}>
                <BatchSummary batch={recent.batch} />
              </div>
            )}
            <div className="min-h-0 flex-1">
              {articles.data ? (
                <ArticleTable
                  spaceId={spaceId}
                  ink={ink}
                  articles={shown}
                  needle={needle}
                  query={query}
                  onClearQuery={() => setQuery('')}
                  selection={selection}
                  onOpen={preview.show}
                  onDeleteSelected={() => setConfirmDelete(true)}
                />
              ) : (
                <div className={cn(surface, 'h-full animate-pulse')} />
              )}
            </div>
          </div>
        </div>
      )}
      <ArticlePreview
        spaceId={spaceId}
        articleId={preview.id}
        open={preview.open}
        onOpenChange={preview.onOpenChange}
      />
      <DeleteArticlesDialog
        spaceId={spaceId}
        articleIds={selection.selected}
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        onDeleted={selection.clear}
      />
    </section>
  )
}
