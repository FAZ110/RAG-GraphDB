import type { ReactNode } from 'react'
import { UploadIcon } from 'lucide-react'
import { IconButton } from '@/components/deck'
import { useAddArticlesClick } from '../add/addArticlesContext'
import { ArticleSearch } from './ArticleSearch'

interface Props {
  spaceId: string
  /** The heading, or the tabs that stand in for it. */
  title: ReactNode
  extraActions?: ReactNode
  hasArticles: boolean
  query: string
  onQueryChange: (query: string) => void
  searching: boolean
  onSearchingChange: (open: boolean) => void
  status: string
}

export function ArticlesToolbar({
  spaceId,
  title,
  extraActions,
  hasArticles,
  query,
  onQueryChange,
  searching,
  onSearchingChange,
  status,
}: Props) {
  const addArticles = useAddArticlesClick(spaceId)

  return (
    <div className="flex min-h-10 items-center gap-x-4">
      <div className="max-w-full min-w-0">{title}</div>
      {hasArticles && (
        <div className="flex flex-1 items-center justify-end gap-2">
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
          {extraActions}
        </div>
      )}
    </div>
  )
}
