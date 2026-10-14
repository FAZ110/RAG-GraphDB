import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { motion } from 'motion/react'
import { PlusIcon } from 'lucide-react'
import type { Space } from '@/types'
import { MapSheet } from './MapSheet'
import { normalize } from './spaceSearch'
import { inkFor } from './spaceVisuals'
import type { Ink } from './spaceVisuals'

const PENCIL: Ink = { name: 'ołówek', color: '#94A3B8', field: '#F8FAFC' }

interface Props {
  results: Space[]
  active: Space | undefined
  needle: string
  query: string
  onHover: (position: number) => void
  onPick: (space: Space) => void
  onCreate: (name: string) => void
}

function highlight(name: string, needle: string): ReactNode {
  const at = needle ? normalize(name).indexOf(needle) : -1
  if (at === -1) return name
  return (
    <>
      {name.slice(0, at)}
      <mark className="bg-transparent font-semibold text-slate-900 underline decoration-2 underline-offset-2">
        {name.slice(at, at + needle.length)}
      </mark>
      {name.slice(at + needle.length)}
    </>
  )
}

const plural = new Intl.PluralRules('pl-PL')

function count(value: number, forms: Record<'one' | 'few' | 'many', string>): string {
  const form = plural.select(value)
  return `${value} ${form === 'one' || form === 'few' ? forms[form] : forms.many}`
}

// A sheet on the pile that lists the spaces matching the deck's search field.
// It is picked up in place of the current sheet while searching, in the colour of the
// highlighted result.
export function SearchCard({ results, active, needle, query, onHover, onPick, onCreate }: Props) {
  const list = useRef<HTMLUListElement>(null)
  const ink = active ? inkFor(active.id) : null

  useEffect(() => {
    list.current
      ?.querySelector<HTMLElement>('[aria-selected="true"]')
      ?.scrollIntoView({ block: 'nearest' })
  }, [active])

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85, y: 24 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 24 }}
      // mousedown would blur the search field and close the card before a click lands
      onMouseDown={(e) => e.preventDefault()}
      className="relative"
    >
      {/* A sheet like the lifted space, in the colour of the highlighted result, with
          the results printed over its faded map. */}
      <MapSheet spaceId={active?.id ?? 'draft'} ink={ink ?? PENCIL} lifted bare>
        <div
          className="h-full p-[6%] pr-[4%]"
          style={{ textShadow: `0 0 10px ${(ink ?? PENCIL).field}` }}
        >
          {results.length > 0 ? (
            <ul
              ref={list}
              id="space-search-list"
              role="listbox"
              aria-label="Przestrzenie"
              className="h-full overflow-y-auto pr-2"
            >
              {results.map((space, position) => {
                const spaceInk = inkFor(space.id)
                const selected = space === active
                return (
                  <li
                    key={space.id}
                    id={`space-search-${space.id}`}
                    role="option"
                    aria-selected={selected}
                    onMouseMove={() => onHover(position)}
                    onClick={() => onPick(space)}
                    className="flex cursor-pointer items-baseline gap-3 border-b border-l-[3px] border-b-slate-900/10 py-2 pl-3 transition-colors last:border-b-0"
                    style={{ borderLeftColor: selected ? spaceInk.color : 'transparent' }}
                  >
                    <span
                      className="size-2.5 shrink-0 self-center"
                      style={{ backgroundColor: spaceInk.color }}
                      aria-hidden="true"
                    />
                    <p
                      className={`min-w-0 flex-1 truncate text-lg leading-snug ${
                        selected ? 'font-bold' : 'font-medium'
                      }`}
                      style={{ color: selected ? '#0f172a' : '#475569' }}
                    >
                      {highlight(space.name, needle)}
                    </p>
                    <p
                      className="shrink-0 text-right text-sm font-medium tabular-nums"
                      style={{ color: selected ? spaceInk.color : '#64748b' }}
                    >
                      {count(space.article_count, {
                        one: 'artykuł',
                        few: 'artykuły',
                        many: 'artykułów',
                      })}
                    </p>
                  </li>
                )
              })}
            </ul>
          ) : (
            <div className="flex h-full flex-col items-start justify-end gap-4">
              <p className="text-2xl leading-tight font-bold text-balance text-slate-900">
                Żadna przestrzeń nie pasuje do „{query.trim()}”
              </p>
              <button
                type="button"
                onClick={() => onCreate(query.trim())}
                className="deck-button flex h-10 items-center gap-2 border border-slate-900 bg-slate-900 px-4 text-sm font-medium text-white [text-shadow:none] hover:bg-slate-800 focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 focus-visible:outline-none"
              >
                <PlusIcon className="size-4" />
                Utwórz przestrzeń „{query.trim()}”
              </button>
            </div>
          )}
        </div>
      </MapSheet>
    </motion.div>
  )
}
