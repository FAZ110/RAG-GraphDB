import { useState } from 'react'
import { surface } from '@/components/deck'
import type { Ink } from '@/design/inks'
import { useSpaceArticles } from '@/hooks/useSpaces'
import { normalize } from '@/lib/text'
import { cn } from '@/lib/utils'
import { ArticlePreview } from '../preview/ArticlePreview'
import { useArticlePreview } from '../preview/useArticlePreview'
import { filterArticles } from '../spaceSearch'
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

  const all = articles.data ?? []
  const needle = normalize(query.trim())
  const shown = filterArticles(all, needle)
  const selection = useArticleSelection(shown)

  return (
    <section className="flex min-h-56 flex-1 flex-col gap-3">
      <ArticlesToolbar
        spaceId={spaceId}
        title={<h2 className="flex h-10 items-center text-heading text-fg">Artykuły</h2>}
        hasArticles={all.length > 0}
        query={query}
        onQueryChange={setQuery}
        searching={searching}
        onSearchingChange={setSearching}
        status={`${shown.length} z ${all.length}`}
      />
      {articles.data?.length === 0 ? (
        <EmptyArticles spaceId={spaceId} ink={ink} />
      ) : (
        // Padding leaves room for the table's offset shadow.
        <div className="min-h-0 flex-1 pb-2">
          {articles.data ? (
            <ArticleTable
              spaceId={spaceId}
              articles={shown}
              needle={needle}
              query={query}
              selection={selection}
              onOpen={preview.show}
              onDeleteSelected={() => setConfirmDelete(true)}
            />
          ) : (
            <div className={cn(surface, 'h-full animate-pulse')} />
          )}
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
