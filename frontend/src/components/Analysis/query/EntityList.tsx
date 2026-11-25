import { ChevronRightIcon } from 'lucide-react'
import { Swatch } from '@/components/deck'
import { focusRing } from '@/components/deck/styles'
import { inkFor } from '@/design/inks'
import { staggerDelay } from '@/design/motion'
import { cn } from '@/lib/utils'
import type { QueryResult } from '@/types/query'
import { LoadMore } from './LoadMore'
import { countedText, countUnit } from './counting'
import type { PatternNode } from './pattern'
import type { Lit } from './PatternStage'

interface Props {
  node: PatternNode
  result: QueryResult
  onPick: (id: string) => void
  more: { has: boolean; loading: boolean; load: () => void }
  onHover: (lit: Lit | null) => void
}

/** What the one sought node turned out to be: its entities, best first. */
export function EntityList({ node, result, onPick, more, onHover }: Props) {
  const entities = new Map(result.nodes.map((n) => [n.id, n]))
  const tally = result.counted?.[node.key] ?? {}
  // An optional link that is missing leaves no entity to list.
  const ids = [...new Set(result.matches.flatMap((m) => m[node.key] ?? []))]

  return (
    <div
      className="flex flex-col"
      onMouseEnter={() => onHover(new Map([[node.key, null]]))}
      onMouseLeave={() => onHover(null)}
    >
      <ul className="flex flex-col px-2 pt-2 pb-3">
        {ids.map((id, i) => {
          const entity = entities.get(id)
          if (!entity) return null
          return (
            // A result new to the list fades in, a few after one another, in CSS so a long
            // list costs nothing when it re-renders; kept rows stay put.
            <li
              key={id}
              style={{ animationDelay: `${staggerDelay(i)}s` }}
              className="animate-in border-t border-line-soft fade-in-0 fill-mode-backwards spring-base first:border-t-0"
            >
              <button
                type="button"
                onClick={() => onPick(id)}
                className={cn(
                  'group flex w-full items-center gap-2 px-3 py-2.5 text-left hover:bg-surface-sunken',
                  focusRing
                )}
              >
                <Swatch color={inkFor(entity.label).color} className="size-2 shrink-0" />
                {/* Only the name: why it answers is in its details. */}
                <span className="min-w-0 flex-1 truncate text-[15px] font-medium text-fg">
                  {entity.name}
                </span>
                {/* What its count came to, which the list is ranked by. */}
                {node.linkCount && tally[id] !== undefined && (
                  <span
                    className="flex shrink-0 items-baseline gap-1 text-xs text-fg-subtle"
                    title={countedText(node.linkCount, tally[id])}
                  >
                    <span className="text-sm font-semibold text-fg tabular-nums">{tally[id]}</span>
                    {countUnit(node.linkCount, tally[id])}
                  </span>
                )}
                <ChevronRightIcon
                  className="size-4 shrink-0 text-fg-faint group-hover:text-fg"
                  aria-hidden
                />
              </button>
            </li>
          )
        })}
      </ul>
      {more.has && <LoadMore loading={more.loading} onLoad={more.load} />}
    </div>
  )
}
