import { motion } from 'motion/react'
import type { ReactNode } from 'react'
import { Swatch, focusRing } from '@/components/deck'
import { inkFor } from '@/design/inks'
import { move } from '@/design/motion'
import { cn } from '@/lib/utils'
import type { Space } from '@/types'

function Tab({
  active,
  onSelect,
  children,
}: {
  active: boolean
  onSelect: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onSelect}
      className={cn(
        'relative flex h-10 items-center gap-2 text-heading transition-colors',
        active ? 'text-fg' : 'text-fg-faint hover:text-fg-muted',
        focusRing
      )}
    >
      {children}
      {active && (
        <motion.span
          layoutId="analyses-scope"
          className="absolute inset-x-0 bottom-0 h-0.5 bg-fg"
          transition={move.quick}
        />
      )}
    </button>
  )
}

interface Props {
  space: Space | undefined
  onlySpace: boolean
  counts: { all: number; space: number }
  onChange: (onlySpace: boolean) => void
}

/** Every analysis, or only those of the space picked in the rail. */
export function ScopeTabs({ space, onlySpace, counts, onChange }: Props) {
  return (
    <div role="tablist" aria-label="Które analizy" className="flex items-center gap-6">
      <Tab active={!onlySpace} onSelect={() => onChange(false)}>
        Wszystkie
        <span className="text-sm font-normal text-fg-subtle tabular-nums">{counts.all}</span>
      </Tab>
      {space && (
        <Tab active={onlySpace} onSelect={() => onChange(true)}>
          <Swatch color={inkFor(space.id).color} />
          {/* Which one is the rail's to say; its name is a hover away. */}
          <span title={space.name}>Wybrana przestrzeń</span>
          <span className="text-sm font-normal text-fg-subtle tabular-nums">{counts.space}</span>
        </Tab>
      )}
    </div>
  )
}
