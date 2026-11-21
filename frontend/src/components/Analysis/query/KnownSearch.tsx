import { AnimatePresence, motion } from 'motion/react'
import { useQuery } from '@tanstack/react-query'
import { PlusIcon, SearchIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { Swatch } from '@/components/deck'
import { focusRing } from '@/components/deck/styles'
import { typeName } from '@/components/Spaces/spaceText'
import { inkFor } from '@/design/inks'
import { SPACES_QUERY_KEY } from '@/hooks/useSpaces'
import { fade, pop } from '@/design/motion'
import { cn } from '@/lib/utils'
import { normalize } from '@/lib/text'
import { fetchSimilarNodes } from '@/services/api'
import { useEntityPool } from '@/components/Analysis/dock/searchResults'
import type { LoadedNode } from '@/types'

// Search by meaning waits for typing to settle; names are matched at every key.
const SETTLE_MS = 250
const NAMED = 8
const ALIKE = 3

interface Hit {
  id: string
  name: string
  label: string
}

interface Props {
  spaceId: string
  /** Entities already in the question, left out of the hits. */
  inside: ReadonlySet<string>
  onPick: (entity: LoadedNode) => void
  placeholder?: string
  /** Off where the field is one of several, so opening the settings does not grab the keyboard. */
  autoFocus?: boolean
  /** Hits laid over what is below instead of pushing it down, for a field in a bar. */
  floating?: boolean
  /** The field's name for screen readers; it shows no label of its own. */
  label?: string
}

/** Find an entity by name and add it to the question as a known node. */
export function KnownSearch({
  spaceId,
  inside,
  onPick,
  placeholder = '',
  autoFocus = true,
  floating = false,
  label = 'Dodaj znaną encję do pytania',
}: Props) {
  const [text, setText] = useState('')
  const [asked, setAsked] = useState('')
  const [active, setActive] = useState(0)
  const field = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const timer = setTimeout(() => setAsked(text.trim()), SETTLE_MS)
    return () => clearTimeout(timer)
  }, [text])

  // Names at once, from the entities the space keeps at hand; starts first, then contains,
  // best connected first. Meaning comes after, slower, for what the name does not hold.
  const pool = useEntityPool(spaceId)
  const needle = normalize(text.trim())
  const rank = (name: string) => (normalize(name).startsWith(needle) ? 0 : 1)
  const named: Hit[] = (pool.data ?? [])
    .filter((n) => !inside.has(n.id) && needle.length >= 2 && normalize(n.name).includes(needle))
    .toSorted((a, b) => rank(a.name) - rank(b.name) || b.degree - a.degree)
    .slice(0, NAMED)
  const search = useQuery({
    queryKey: [...SPACES_QUERY_KEY, spaceId, 'similar', asked],
    queryFn: () => fetchSimilarNodes(spaceId, asked, NAMED),
    enabled: asked.length >= 2,
    staleTime: 60_000,
  })
  const alike: Hit[] = (search.data ?? [])
    .filter((h) => !inside.has(h.id) && !named.some((n) => n.id === h.id))
    .slice(0, ALIKE)
  const hits = [...named, ...alike]
  const open = text.trim().length >= 2

  const pick = (i: number) => {
    const hit = hits[i]
    if (!hit) return
    onPick({ id: hit.id, name: hit.name, label: hit.label, degree: 0, properties: {} })
    setText('')
    setActive(0)
    field.current?.focus()
  }
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      const step = e.key === 'ArrowDown' ? 1 : -1
      setActive((a) => (hits.length ? (a + step + hits.length) % hits.length : 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      e.stopPropagation()
      pick(active)
    }
  }

  return (
    <div className={cn('flex flex-col gap-1', floating && 'relative')}>
      <label
        className={cn(
          'flex items-center gap-2 border border-line bg-surface px-2.5 focus-within:border-fg',
          floating ? 'h-8' : 'h-9'
        )}
      >
        <SearchIcon className="size-4 shrink-0 text-fg-faint" aria-hidden />
        <input
          ref={field}
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            setActive(0)
          }}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          autoFocus={autoFocus}
          aria-label={label}
          aria-expanded={open}
          aria-controls="known-hits"
          role="combobox"
          className="min-w-0 flex-1 bg-transparent text-sm text-fg outline-none placeholder:text-fg-faint"
        />
      </label>
      <AnimatePresence initial={false}>
        {open && (
          <motion.ul
            {...(floating ? pop : fade)}
            id="known-hits"
            role="listbox"
            className={cn(
              'max-h-56 origin-top overflow-y-auto border border-line-soft bg-surface',
              floating &&
                'absolute inset-x-0 top-full z-20 mt-1 border-line shadow-[4px_4px_0_var(--line)]'
            )}
          >
            {hits.map((hit, i) => (
              <li key={hit.id} role="option" aria-selected={i === active}>
                <button
                  type="button"
                  onMouseEnter={() => setActive(i)}
                  onClick={() => pick(i)}
                  className={cn(
                    'flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-sm',
                    i === active ? 'bg-surface-sunken text-fg' : 'text-fg-soft',
                    focusRing
                  )}
                >
                  <Swatch color={inkFor(hit.label).color} className="size-2" />
                  <span className="min-w-0 flex-1 truncate">{hit.name}</span>
                  <span className="text-xs text-fg-subtle">{typeName(hit.label)}</span>
                  {i === active && <PlusIcon className="size-3.5 text-fg-muted" aria-hidden />}
                </button>
              </li>
            ))}
            {hits.length === 0 && (
              <li className="px-2.5 py-1.5 text-sm text-fg-subtle">
                {pool.isPending || search.isFetching || asked !== text.trim()
                  ? 'Szukam…'
                  : 'Nic takiego w tej przestrzeni.'}
              </li>
            )}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  )
}
