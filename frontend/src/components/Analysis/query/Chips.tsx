import { SearchIcon } from 'lucide-react'
import { useState } from 'react'
import { focusRing } from '@/components/deck/styles'
import { cn } from '@/lib/utils'

export interface Chip<T> {
  value: T
  label: string
  /** A count beside the label, e.g. how many such entities the space has. */
  count?: number
  /** Why it cannot be chosen here, shown on hover; it stays in view, greyed out. */
  blocked?: string
}

interface Props<T extends string | number> {
  label: string
  chips: readonly Chip<T>[]
  value: T
  onChange: (value: T) => void
  /**
   * With more choices than this, only the most common show, the rest are found by typing.
   * The first `pinned` chips (the "any" choice and the like) always show.
   */
  limit?: number
  pinned?: number
}

const fold = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')

/** The choices laid out at once, the chosen one filled; a long list is cut and searched in place. */
export function Chips<T extends string | number>({
  label,
  chips,
  value,
  onChange,
  limit = Infinity,
  pinned = 1,
}: Props<T>) {
  const [needle, setNeedle] = useState('')
  const first = chips.slice(0, pinned)
  const rest = chips.slice(pinned)
  const many = rest.length > limit
  const common = rest.toSorted((a, b) => (b.count ?? 0) - (a.count ?? 0))
  const wanted = fold(needle.trim())
  let shown = wanted
    ? common.filter((c) => fold(c.label).includes(wanted)).slice(0, limit)
    : common.slice(0, limit)
  // The chosen one stays in view even when it is not among the most common.
  const chosen = rest.find((c) => c.value === value)
  if (chosen && !shown.includes(chosen)) shown = [...shown, chosen]

  return (
    <div className="flex flex-col gap-2">
      {/* Searching comes first; the most common choices follow as examples. */}
      {many && (
        <label className="flex h-8 w-full max-w-xs items-center gap-2 border border-line bg-surface px-2.5 text-sm focus-within:border-fg">
          <SearchIcon className="size-4 shrink-0 text-fg-faint" aria-hidden />
          <input
            value={needle}
            onChange={(e) => setNeedle(e.target.value)}
            placeholder={`Szukaj wśród ${rest.length}`}
            aria-label={`${label}: szukaj`}
            className="min-w-0 flex-1 bg-transparent text-fg outline-none placeholder:text-fg-subtle"
          />
        </label>
      )}
      <div role="radiogroup" aria-label={label} className="flex flex-wrap items-center gap-1.5">
        {[...first, ...shown].map((chip) => {
          const on = chip.value === value
          return (
            <button
              key={chip.value}
              type="button"
              role="radio"
              aria-checked={on}
              disabled={!!chip.blocked && !on}
              title={chip.blocked}
              onClick={() => onChange(chip.value)}
              className={cn(
                'flex h-7 items-center gap-1.5 border px-2.5 text-xs transition-colors',
                on
                  ? 'border-fg bg-fg font-semibold text-fg-inverse'
                  : 'border-line bg-surface text-fg-soft hover:border-fg hover:text-fg',
                'disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-line disabled:hover:text-fg-soft',
                focusRing
              )}
            >
              {chip.label}
              {chip.count !== undefined && (
                <span
                  className={cn('tabular-nums', on ? 'text-fg-inverse-muted' : 'text-fg-subtle')}
                >
                  {chip.count}
                </span>
              )}
            </button>
          )
        })}
        {wanted && shown.length === 0 && (
          <span className="text-xs text-fg-subtle">Nic o takiej nazwie</span>
        )}
      </div>
    </div>
  )
}
