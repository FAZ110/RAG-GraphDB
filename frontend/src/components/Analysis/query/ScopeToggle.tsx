import { focusRing } from '@/components/deck/styles'
import { cn } from '@/lib/utils'
import type { QueryScope } from './usePatternQuery'

const SCOPES = [
  {
    value: 'analysis',
    label: 'W analizie',
    hint: 'Tylko encje z płótna; wyniki zostaną zaznaczone',
  },
  {
    value: 'space',
    label: 'W przestrzeni',
    hint: 'Cały graf przestrzeni; nowe encje trafią na płótno',
  },
] as const

interface Props {
  value: QueryScope
  /** How many entities each side searches, shown beside its name. */
  sizes: Record<QueryScope, number | undefined>
  onChange: (value: QueryScope) => void
}

/** Where answers come from, as a switch whose deck thumb slides to the chosen side. */
export function ScopeToggle({ value, sizes, onChange }: Props) {
  const index = SCOPES.findIndex((s) => s.value === value)
  return (
    <div
      role="radiogroup"
      aria-label="Gdzie szukać"
      className="relative grid shrink-0 grid-cols-2 border border-line bg-surface-sunken"
    >
      {/* The thumb, raised on the space's own shadow; a transform moves it, off the main thread. */}
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 w-1/2 bg-fg shadow-[2px_2px_0_var(--deck-shadow)] transition-transform spring-quick"
        style={{ transform: `translateX(${index * 100}%)` }}
      />
      {SCOPES.map(({ value: scope, label, hint }) => {
        const on = value === scope
        return (
          <button
            key={scope}
            type="button"
            role="radio"
            aria-checked={on}
            title={hint}
            onClick={() => onChange(scope)}
            className={cn(
              // One weight on both sides: only the colour changes, so the text never shifts.
              'relative flex h-8 items-center justify-center gap-1.5 px-3 text-xs font-medium whitespace-nowrap transition-colors spring-quick',
              on ? 'text-fg-inverse' : 'text-fg-soft hover:text-fg',
              focusRing
            )}
          >
            {label}
            {sizes[scope] !== undefined && (
              <span
                className={cn(
                  'tabular-nums transition-colors spring-quick',
                  on ? 'text-fg-inverse-muted' : 'text-fg-subtle'
                )}
              >
                {sizes[scope]}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
