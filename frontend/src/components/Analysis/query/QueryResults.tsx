import { ChevronRightIcon } from 'lucide-react'
import { Swatch } from '@/components/deck'
import { focusRing } from '@/components/deck/styles'
import { pluralForm } from '@/components/Spaces/spaceText'
import { inkFor } from '@/design/inks'
import { staggerDelay } from '@/design/motion'
import { cn } from '@/lib/utils'
import type { QueryResult } from '@/types/query'
import type { Pattern } from './pattern'
import { LoadMore } from './LoadMore'
import { SoughtTag } from './SoughtTag'
import { countedText, countUnit } from './counting'

const MATCH_FORMS = { one: 'wynik', few: 'wyniki', many: 'wyników' }

interface Props {
  pattern: Pattern
  result: QueryResult
  onPick: (id: string) => void
  /** The next page of the answer, while there is one. */
  more: { has: boolean; loading: boolean; load: () => void }
  /** The sought node whose results are under the pointer, to pick it out in the drawing. */
  onHover: (key: string | null) => void
}

/** What each sought node turned out to be, under the same name it has in the drawing. */
export function QueryResults({ pattern, result, onPick, onHover, more }: Props) {
  const entities = new Map(result.nodes.map((n) => [n.id, n]))
  const sought = pattern.nodes.filter((n) => !n.known)

  return (
    <div className="flex flex-col">
      {sought.map((node) => {
        // An optional link that is missing leaves no entity to list.
        const tally = result.counted?.[node.key] ?? {}
        const ids = [...new Set(result.matches.flatMap((m) => (m[node.key] ? [m[node.key]!] : [])))]
        return (
          <section
            key={node.key}
            onMouseEnter={() => onHover(node.key)}
            onMouseLeave={() => onHover(null)}
            className="border-b border-line-soft last:border-b-0"
          >
            {/* With one sought entity the question above already names it. */}
            {sought.length > 1 && (
              <h3 className="sticky top-0 z-1 flex items-center gap-2 bg-surface px-5 pt-4 pb-2 text-sm">
                <SoughtTag node={node} />
                <span className="text-xs text-fg-subtle">
                  {ids.length}
                  {result.truncated ? '+' : ''} {pluralForm(ids.length, MATCH_FORMS)}
                </span>
              </h3>
            )}
            <ul className={cn('flex flex-col px-2 pb-3', sought.length === 1 && 'pt-2')}>
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
                          <span className="text-sm font-semibold text-fg tabular-nums">
                            {tally[id]}
                          </span>
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
          </section>
        )
      })}
      {more.has && <LoadMore loading={more.loading} onLoad={more.load} />}
      {result.truncated && !more.has && (
        <p className="px-5 py-3 text-xs text-fg-subtle">
          Dopasowań było więcej, niż baza zwraca na raz; zawęź pytanie, żeby zobaczyć wszystkie.
        </p>
      )}
    </div>
  )
}
