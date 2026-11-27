import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import { IconButton } from '@/components/deck'

export const ARTICLES_PER_PAGE = 100

interface Props {
  page: number
  pages: number
  onPageChange: (page: number) => void
}

export function ArticlePager({ page, pages, onPageChange }: Props) {
  if (pages <= 1) return null
  return (
    <nav aria-label="Strony artykułów" className="flex items-center justify-center gap-3 pt-2">
      <IconButton
        variant="ghost"
        label="Poprzednia strona"
        disabled={page === 0}
        onClick={() => onPageChange(page - 1)}
      >
        <ChevronLeftIcon />
      </IconButton>
      <span className="text-sm text-fg-subtle tabular-nums">
        Strona {page + 1} z {pages}
      </span>
      <IconButton
        variant="ghost"
        label="Następna strona"
        disabled={page === pages - 1}
        onClick={() => onPageChange(page + 1)}
      >
        <ChevronRightIcon />
      </IconButton>
    </nav>
  )
}
