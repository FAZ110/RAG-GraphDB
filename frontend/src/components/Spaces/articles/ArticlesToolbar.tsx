import type { ReactNode } from 'react'
import { UploadIcon } from 'lucide-react'
import { IconButton } from '@/components/deck'
import { cn } from '@/lib/utils'
import { useAddArticlesClick } from '../add/addArticlesContext'
import { ArticleSearch } from './ArticleSearch'

interface Props {
  spaceId: string
  /** The heading, or the tabs that stand in for it. */
  title: ReactNode
  hasArticles: boolean
  query: string
  onQueryChange: (query: string) => void
  searching: boolean
  onSearchingChange: (open: boolean) => void
  status: string
}

// The actions drop to a row of their own only when even their minimum width doesn't fit.
export function ArticlesToolbar({
  spaceId,
  title,
  hasArticles,
  query,
  onQueryChange,
  searching,
  onSearchingChange,
  status,
}: Props) {
  const addArticles = useAddArticlesClick(spaceId)

  return (
    <div className="flex min-h-10 flex-wrap items-center gap-x-4 gap-y-3">
      <div className="max-w-full min-w-0">{title}</div>
      {hasArticles && (
        <div
          className={cn(
            'flex grow basis-0 items-center justify-end gap-2',
            searching ? 'min-w-68' : 'min-w-34'
          )}
        >
          <ArticleSearch
            query={query}
            onQueryChange={onQueryChange}
            open={searching}
            onOpenChange={onSearchingChange}
            status={status}
          />
          <IconButton size="icon-lg" label="Dodaj artykuły" onClick={addArticles}>
            <UploadIcon />
          </IconButton>
        </div>
      )}
    </div>
  )
}
