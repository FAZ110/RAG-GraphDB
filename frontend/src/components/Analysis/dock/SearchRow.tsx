import { FileTextIcon, ShapesIcon, SplineIcon } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { HighlightedText, Swatch } from '@/components/deck'
import { typeName } from '@/components/Spaces/spaceText'
import { inkFor } from '@/design/inks'
import { cn } from '@/lib/utils'
import type { SearchHit } from './searchResults'

interface Props {
  hit: SearchHit
  needle: string
  active: boolean
  onCanvas: boolean
  onHover: () => void
  onPick: () => void
}

/** What picking a hit will do, or what it holds, said on its right. */
function aside(hit: SearchHit, onCanvas: boolean) {
  if (hit.kind === 'entity') return onCanvas ? 'już na płótnie' : typeName(hit.label)
  if (hit.kind === 'article') {
    if (!hit.entities) return ''
    if (hit.placed >= hit.entities) return 'już na płótnie'
    return hit.placed ? `${hit.placed}/${hit.entities} na płótnie` : `${hit.entities} encji`
  }
  return `wszystkie ${hit.count}`
}

export function SearchRow({ hit, needle, active, onCanvas, onHover, onPick }: Props) {
  const row = useRef<HTMLLIElement>(null)
  // Walked to with the arrow keys, the row scrolls into the list's view.
  useEffect(() => {
    if (active) row.current?.scrollIntoView({ block: 'nearest' })
  }, [active])
  return (
    <li ref={row} role="option" aria-selected={active}>
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onMouseEnter={onHover}
        onClick={onPick}
        className={cn(
          'flex w-full items-start gap-2.5 px-3 py-1.5 text-left text-sm',
          active ? 'bg-surface-sunken text-fg' : 'text-fg-soft',
          (onCanvas || (hit.kind === 'article' && !!hit.entities && hit.placed >= hit.entities)) &&
            'text-fg-subtle'
        )}
      >
        <span className="flex h-5 shrink-0 items-center">
          {hit.kind === 'article' ? (
            <FileTextIcon className="size-3.5 text-fg-faint" aria-hidden="true" />
          ) : hit.kind === 'relation' ? (
            <SplineIcon className="size-3.5 text-fg-faint" aria-hidden="true" />
          ) : hit.kind === 'type' ? (
            <ShapesIcon
              className="size-3.5"
              style={{ color: inkFor(hit.id).color }}
              aria-hidden="true"
            />
          ) : (
            <Swatch color={inkFor(hit.label).color} className="rounded-full" />
          )}
        </span>
        <span className="min-w-0 flex-1">
          {/* Articles are browsed by title, so it may take two lines before it is cut. */}
          <span className={cn('block', hit.kind === 'article' ? 'line-clamp-2' : 'truncate')}>
            <HighlightedText text={hit.name} needle={needle} />
          </span>
          {hit.kind === 'article' && (
            <span className="block truncate text-xs text-fg-subtle">{hit.source}</span>
          )}
        </span>
        <span className="flex h-5 shrink-0 items-center text-xs text-fg-subtle tabular-nums">
          {aside(hit, onCanvas)}
        </span>
      </button>
    </li>
  )
}
