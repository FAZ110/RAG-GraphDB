import type { ReactNode } from 'react'
import { motion } from 'motion/react'
import { focusRing } from '@/components/deck'
import type { Ink } from '@/design/inks'
import { move } from '@/design/motion'
import { cn } from '@/lib/utils'

interface Props {
  active: boolean
  ink: Ink
  onSelect: () => void
  children: ReactNode
}

export function SourceTab({ active, ink, onSelect, children }: Props) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onSelect}
      className={cn(
        'relative h-9 px-1 text-sm font-semibold transition-colors',
        active ? 'text-fg' : 'text-fg-subtle hover:text-fg',
        focusRing
      )}
    >
      {children}
      {active && (
        <motion.span
          layoutId="add-source-tab"
          className="absolute inset-x-0 -bottom-px h-0.5"
          style={{ backgroundColor: ink.color }}
          transition={move.quick}
        />
      )}
    </button>
  )
}
