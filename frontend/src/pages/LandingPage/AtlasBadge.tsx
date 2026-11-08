import { AtlasMark } from '@/components/nav/AtlasMark'
import { cn } from '@/lib/utils'

/** The dark tile of the sign-in page, for the mark at small sizes. */
export function AtlasBadge({ markSize, className }: { markSize: number; className: string }) {
  return (
    <span
      className={cn(
        'deck grid shrink-0 place-items-center border border-fg bg-fg text-fg-inverse [--deck-shadow:var(--ink-steel)]',
        className
      )}
    >
      <AtlasMark size={markSize} />
    </span>
  )
}
