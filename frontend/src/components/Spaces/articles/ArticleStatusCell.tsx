import { ChevronDownIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Article } from '@/types'
import { ARTICLE_STATUS } from './articleStatus'

interface Props {
  article: Article
  showError: boolean
  onShowErrorChange: (show: boolean) => void
}

export function ArticleStatusCell({ article, showError, onShowErrorChange }: Props) {
  return (
    <div className="hidden text-sm @3xl:block">
      {article.status === 'error' ? (
        <button
          type="button"
          onClick={() => onShowErrorChange(!showError)}
          aria-expanded={showError}
          className="flex items-center gap-1 font-semibold text-danger hover:text-danger-strong focus-visible:ring-2 focus-visible:ring-danger focus-visible:outline-none"
        >
          Pokaż błąd
          <ChevronDownIcon
            className={cn('size-4 transition-transform spring-quick', showError && 'rotate-180')}
          />
        </button>
      ) : (
        <span className={article.status === 'ok' ? 'text-fg-muted' : 'text-fg-faint'}>
          {ARTICLE_STATUS[article.status].label}
        </span>
      )}
    </div>
  )
}
