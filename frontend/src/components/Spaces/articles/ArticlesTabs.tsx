import type { ReactNode } from 'react'
import { XIcon } from 'lucide-react'
import { focusRing } from '@/components/deck'
import { cn } from '@/lib/utils'
import type { Batch } from '@/types'
import { BatchCount } from '../batches/BatchCount'
import type { ArticlesTab } from '../batches/useRecentBatch'

interface Props {
  total: number
  /** The latest upload, while its tab is open. */
  recent: Batch | undefined
  tab: ArticlesTab
  onTabChange: (tab: ArticlesTab) => void
  onCloseRecent: () => void
}

function Tab({
  active,
  onSelect,
  children,
}: {
  active: boolean
  onSelect: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onSelect}
      className={cn(
        'flex h-10 items-center gap-2 border-b-2 text-heading transition-colors',
        active ? 'border-fg text-fg' : 'border-transparent text-fg-faint hover:text-fg-muted',
        focusRing
      )}
    >
      {children}
    </button>
  )
}

export function ArticlesTabs({ total, recent, tab, onTabChange, onCloseRecent }: Props) {
  return (
    <div
      role="tablist"
      aria-label="Artykuły"
      className="flex items-center gap-6 overflow-x-auto whitespace-nowrap [scrollbar-width:none]"
    >
      <Tab active={tab === 'all'} onSelect={() => onTabChange('all')}>
        Artykuły
        <span className="text-sm font-normal text-fg-subtle tabular-nums">{total}</span>
      </Tab>
      {recent && (
        <span className="flex items-center gap-1">
          <Tab active={tab === 'recent'} onSelect={() => onTabChange('recent')}>
            Ostatnio dodane
            <BatchCount batch={recent} />
          </Tab>
          <button
            type="button"
            aria-label="Zamknij ostatnio dodane"
            title="Zamknij"
            onClick={onCloseRecent}
            className={cn('p-1 text-fg-faint hover:text-fg', focusRing)}
          >
            <XIcon className="size-3.5" />
          </button>
        </span>
      )}
    </div>
  )
}
