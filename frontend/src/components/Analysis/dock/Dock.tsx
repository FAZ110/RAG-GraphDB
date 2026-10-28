import { AnimatePresence, motion } from 'motion/react'
import type { ReactNode } from 'react'
import { reveal } from '@/design/motion'
import { cn } from '@/lib/utils'

interface Props {
  /** Opened onto the tools: the search's list, a proposal or a lookup; keyed by which. */
  bar: { key: string; content: ReactNode } | null
  children: ReactNode
}

/**
 * The bar at the bottom of the canvas: search and tools, opening upwards onto what they show.
 * What opens lies over the panels instead of pushing them aside, framed as one with the tools.
 * On phones the dock sits at the top, so it opens downwards instead.
 */
export function Dock({ bar, children }: Props) {
  return (
    <div className="pointer-events-auto relative w-full max-w-2xl">
      <AnimatePresence initial={false} mode="wait">
        {bar && (
          <motion.div
            key={bar.key}
            {...reveal}
            className="deck absolute inset-x-0 top-full overflow-hidden border-x border-b border-fg bg-surface [--deck-shadow:var(--fg)] md:top-auto md:bottom-full md:border-t md:border-b-0"
          >
            {bar.content}
          </motion.div>
        )}
      </AnimatePresence>
      {/* Positioned, so it paints over the opened part's shadow where the two meet. */}
      <div
        className={cn(
          'deck relative flex items-center gap-1 border border-fg bg-surface p-1.5 [--deck-shadow:var(--fg)]',
          // Where the opened part meets the tools, a light rule rather than a second frame.
          bar && 'border-b-line-soft md:border-b-fg md:border-t-line-soft'
        )}
      >
        {children}
      </div>
    </div>
  )
}
