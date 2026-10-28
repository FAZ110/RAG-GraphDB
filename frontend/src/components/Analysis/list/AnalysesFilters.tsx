import { Checkbox, Swatch, SearchField, SearchFieldButton, focusRing } from '@/components/deck'
import { inkFor } from '@/design/inks'
import { cn } from '@/lib/utils'
import { CheckIcon, XIcon } from 'lucide-react'
import { Popover } from 'radix-ui'
import type { Space } from '@/types'
import { FilterChip } from './FilterChip'
import { PERIODS } from './filters'
import type { Filters } from './filters'

interface Props {
  filters: Filters
  spaces: Space[]
  onChange: (change: Partial<Filters>) => void
}

const row = cn(
  'flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-sm text-fg-soft hover:bg-surface-sunken',
  focusRing
)

/** Narrowing the cards down by name, by space when all are listed, and by when they changed. */
export function AnalysesFilters({ filters, spaces, onChange }: Props) {
  const picked = spaces.filter((s) => filters.spaces.includes(s.id))
  const period = PERIODS.find((p) => p.value === filters.period)!

  return (
    <div className="flex flex-wrap items-center gap-2">
      <SearchField
        size="md"
        placeholder="Szukaj po nazwie"
        value={filters.query}
        onChange={(e) => onChange({ query: e.target.value })}
        className="h-9 w-52 [--deck-shadow:transparent]"
        action={
          filters.query && (
            <SearchFieldButton label="Wyczyść wyszukiwanie" onClick={() => onChange({ query: '' })}>
              <XIcon className="size-3.5" />
            </SearchFieldButton>
          )
        }
      />
      {!filters.onlySpace && spaces.length > 1 && (
        <FilterChip
          label="Przestrzenie"
          value={
            picked.length === 0
              ? null
              : picked.length === 1
                ? picked[0].name
                : String(picked.length)
          }
          onClear={() => onChange({ spaces: [] })}
        >
          {spaces.map((s) => {
            const on = filters.spaces.includes(s.id)
            return (
              <label key={s.id} className={cn(row, 'cursor-pointer')}>
                <Checkbox
                  checked={on}
                  onChange={() =>
                    onChange({
                      spaces: on
                        ? filters.spaces.filter((id) => id !== s.id)
                        : [...filters.spaces, s.id],
                    })
                  }
                />
                <Swatch color={inkFor(s.id).color} />
                <span className="min-w-0 flex-1 truncate">{s.name}</span>
              </label>
            )
          })}
        </FilterChip>
      )}
      <FilterChip
        label="Zmienione"
        value={filters.period === 'any' ? null : period.label.replace('Ostatnie ', '')}
        onClear={() => onChange({ period: 'any' })}
      >
        {PERIODS.map((p) => (
          <Popover.Close key={p.value} asChild>
            <button type="button" className={row} onClick={() => onChange({ period: p.value })}>
              <span className="min-w-0 flex-1">{p.label}</span>
              {p.value === filters.period && <CheckIcon className="size-4 text-fg" />}
            </button>
          </Popover.Close>
        ))}
      </FilterChip>
    </div>
  )
}
