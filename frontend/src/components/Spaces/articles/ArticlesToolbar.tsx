import type { ReactNode } from 'react'
import { UploadIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { IconButton } from '@/components/deck'
import { cn } from '@/lib/utils'
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
          <IconButton asChild size="icon-lg" label="Dodaj artykuły">
            <Link to={`/extract?space=${spaceId}`}>
              <UploadIcon />
            </Link>
          </IconButton>
        </div>
      )}
    </div>
  )
}
