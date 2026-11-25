import { useState } from 'react'
import { pluralForm } from '@/components/Spaces/spaceText'
import { staggerDelay } from '@/design/motion'
import { cn } from '@/lib/utils'
import type { QueryResult } from '@/types/query'
import { GroupPicker } from './GroupPicker'
import { useLetters } from './letters'
import { LoadMore } from './LoadMore'
import { MatchEntity } from './MatchEntity'
import type { Match } from './matches'
import { defaultGroupKey, groupMatches } from './matches'
import type { Pattern } from './pattern'
import type { Lit } from './PatternStage'

const MATCH_FORMS = { one: 'dopasowanie', few: 'dopasowania', many: 'dopasowań' }

interface Props {
  pattern: Pattern
  result: QueryResult
  onPick: (id: string) => void
  more: { has: boolean; loading: boolean; load: () => void }
  onHover: (lit: Lit | null) => void
}

/** Each match whole, its entities after the letters of the nodes they stand for, gathered
 * round one node's entities when the user wants. Works the same for any number of nodes. */
export function MatchList({ pattern, result, onPick, more, onHover }: Props) {
  const letters = useLetters()
  const sought = pattern.nodes.filter((n) => !n.known)
  // Undefined until the user picks: the default follows the question as it changes.
  const [chosen, setChosen] = useState<string | null>()
  const key =
    chosen === undefined || (chosen !== null && !sought.some((n) => n.key === chosen))
      ? defaultGroupKey(pattern, result.matches)
      : chosen
  const head = sought.find((n) => n.key === key)
  const rest = sought.filter((n) => n.key !== key)
  const entities = new Map(result.nodes.map((n) => [n.id, n]))
  const entity = (id: string | null | undefined) => (id ? (entities.get(id) ?? null) : null)
  const tally = (nodeKey: string, id: string | null | undefined) =>
    id ? result.counted?.[nodeKey]?.[id] : undefined
  const lit = (match: Match): Lit =>
    new Map(sought.map((n) => [n.key, entity(match[n.key])?.name ?? null]))

  // One grid for every match, a column per node, so each letter's entities line up down the
  // whole list; grouped, a first column holds the branches off the group's entity.
  const columns = `${head ? '2rem ' : ''}repeat(${rest.length}, minmax(0, max-content)) minmax(0, 1fr)`

  return (
    <div className="flex flex-col" onMouseLeave={() => onHover(null)}>
      <GroupPicker sought={sought} value={key} onChange={setChosen} />
      <div className="grid gap-x-2 px-5 pt-3 pb-4" style={{ gridTemplateColumns: columns }}>
        {groupMatches(result.matches, key).map((group) => (
          <section
            key={group.id ?? 'all'}
            className="col-span-full grid grid-cols-subgrid pb-4 last:pb-0"
          >
            {head && (
              // Kept in view while its matches scroll under it.
              <h3
                onMouseEnter={() => onHover(new Map([[head.key, entity(group.id)?.name ?? null]]))}
                className="sticky top-0 z-1 col-span-full -mx-5 bg-surface px-5 pt-1 pb-2"
              >
                <span className="relative inline-flex max-w-[calc(100%-1rem)]">
                  <MatchEntity
                    node={head}
                    letter={letters.get(head.key) ?? ''}
                    entity={entity(group.id)}
                    tally={tally(head.key, group.id)}
                    onPick={onPick}
                    hub
                  />
                  {/* How many matches hang off it, marked like the counts on the drawing. */}
                  <span
                    className="pointer-events-none absolute -top-2.5 -right-3 min-w-6 border border-fg bg-fg px-1.5 text-center text-xs leading-5 font-semibold text-fg-inverse tabular-nums"
                    title={`${group.matches.length} ${pluralForm(group.matches.length, MATCH_FORMS)}`}
                  >
                    {group.matches.length}
                  </span>
                </span>
              </h3>
            )}
            <ul className="col-span-full grid grid-cols-subgrid">
              {group.matches.map((match, i) => (
                // Entering by mouse or keyboard shows the match on the drawing.
                <li
                  key={sought.map((n) => match[n.key]).join('|')}
                  onMouseEnter={() => onHover(lit(match))}
                  onFocus={() => onHover(lit(match))}
                  style={{ animationDelay: `${staggerDelay(i)}s` }}
                  className={cn(
                    'group/match relative col-span-full grid animate-in grid-cols-subgrid items-center py-1.5 fade-in-0 fill-mode-backwards spring-base',
                    head
                      ? // A branch off the trunk, which runs down to the last branch and ends there.
                        'before:absolute before:top-0 before:left-4 before:h-full before:w-px before:bg-fg-subtle last:before:h-[22px] after:absolute after:top-[22px] after:left-4 after:h-px after:w-6 after:bg-fg-subtle'
                      : 'border-t border-line-soft first:border-t-0'
                  )}
                >
                  {head && <span aria-hidden />}
                  {rest.map((node) => (
                    <MatchEntity
                      key={node.key}
                      node={node}
                      letter={letters.get(node.key) ?? ''}
                      entity={entity(match[node.key])}
                      tally={tally(node.key, match[node.key])}
                      onPick={onPick}
                      className="w-full"
                    />
                  ))}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      {more.has && <LoadMore loading={more.loading} onLoad={more.load} />}
    </div>
  )
}
