import { Swatch, focusRing } from '@/components/deck'
import { typeName } from '@/components/Spaces/spaceText'
import { inkFor } from '@/design/inks'
import { cn } from '@/lib/utils'

interface Props {
  labels: { label: string; count: number }[]
  label: string | null
  onChange: (label: string | null) => void
}

function Chip({
  on,
  onClick,
  children,
}: {
  on: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      // The field keeps focus, so typing carries on under the new filter.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn(
        'flex h-7 shrink-0 items-center gap-1.5 px-2.5 text-xs font-medium whitespace-nowrap transition-colors',
        on
          ? 'bg-fg text-fg-inverse'
          : 'bg-surface-sunken text-fg-muted hover:bg-line-soft hover:text-fg',
        focusRing
      )}
    >
      {children}
    </button>
  )
}

/** Narrow the entity list to one type, or show them all. */
export function TypeChips({ labels, label, onChange }: Props) {
  return (
    <div className="flex gap-1 overflow-x-auto px-3 py-2 [scrollbar-width:none]">
      <Chip on={label === null} onClick={() => onChange(null)}>
        Wszystkie typy
      </Chip>
      {labels.map((t) => (
        <Chip
          key={t.label}
          on={label === t.label}
          onClick={() => onChange(label === t.label ? null : t.label)}
        >
          <Swatch color={inkFor(t.label).color} className="size-2 rounded-full" />
          {typeName(t.label)}
          <span className="tabular-nums opacity-60">{t.count}</span>
        </Chip>
      ))}
    </div>
  )
}
