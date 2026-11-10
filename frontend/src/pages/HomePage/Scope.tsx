import { motion } from 'motion/react'
import type { ReactNode } from 'react'
import { Swatch, focusRing, surface } from '@/components/deck'
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
        'relative flex h-9 min-w-0 items-center gap-2 text-sm font-medium transition-colors',
        active ? 'text-fg' : 'text-fg-faint hover:text-fg-muted',
        focusRing
      )}
    >
      {children}
      {active && (
        <motion.span
          layoutId="home-scope"
          className="absolute inset-x-0 bottom-0 h-0.5 bg-fg"
          transition={move.quick}
        />
      )}
    </button>
  )
}

interface Props {
  space: Pick<Space, 'id' | 'name'> | undefined
  onlySpace: boolean
  onChange: (onlySpace: boolean) => void
  lead: ReactNode
  children: ReactNode
}

export function Scope({ space, onlySpace, onChange, lead, children }: Props) {
  return (
    <section
      className={cn(surface, 'border-t-4')}
      style={{ borderTopColor: onlySpace && space ? inkFor(space.id).color : 'var(--fg)' }}
    >
      <div className="flex flex-col gap-2 border-b border-line-soft px-4 pt-3">
        {lead}
        <div role="tablist" aria-label="Zakres danych" className="flex min-w-0 items-center gap-6">
          <Tab active={!onlySpace} onSelect={() => onChange(false)}>
            Całe konto
          </Tab>
          {space && (
            <Tab active={onlySpace} onSelect={() => onChange(true)}>
              <Swatch color={inkFor(space.id).color} />
              <span className="truncate">{space.name}</span>
            </Tab>
          )}
        </div>
      </div>
      {/* Keyed, so changing tab or space deals the line in anew. */}
      <div
        key={onlySpace ? space?.id : 'account'}
        role="tabpanel"
        className="deck-land grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4"
      >
        {children}
      </div>
    </section>
  )
}
