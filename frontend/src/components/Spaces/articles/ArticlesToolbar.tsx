import { UploadIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/deck'
import { ArticleSearch } from './ArticleSearch'

interface Props {
  hasArticles: boolean
  query: string
  onQueryChange: (query: string) => void
  searching: boolean
  onSearchingChange: (open: boolean) => void
  status: string
}

// `min-h-10` keeps the heading in place when the buttons are hidden.
export function ArticlesToolbar({
  hasArticles,
  query,
  onQueryChange,
  searching,
  onSearchingChange,
  status,
}: Props) {
  return (
    <div className="flex min-h-10 items-center gap-2">
      <h2 className="mr-auto text-heading text-fg">Artykuły</h2>
      {hasArticles && (
        <>
          <ArticleSearch
            query={query}
            onQueryChange={onQueryChange}
            open={searching}
            onOpenChange={onSearchingChange}
            status={status}
          />
          <Button asChild>
            <Link to="/extract">
              <UploadIcon />
              Dodaj artykuły
            </Link>
          </Button>
        </>
      )}
    </div>
  )
}
