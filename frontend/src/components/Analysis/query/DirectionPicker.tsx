import { ArrowLeftRightIcon, RepeatIcon } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { Button, Swatch } from '@/components/deck'
import { inkFor } from '@/design/inks'
import { swap } from '@/design/motion'
import { cn } from '@/lib/utils'
import type { Direction } from '@/types/query'
import type { PatternNode } from './pattern'
import { labelOf } from './pattern'
import { SoughtTag } from './SoughtTag'

function End({ node }: { node: PatternNode }) {
  if (!node.known) return <SoughtTag node={node} className="max-w-48 text-xs" />
  const label = labelOf(node)
  return (
    <span className="flex max-w-48 min-w-0 items-center gap-1.5 border border-line bg-surface px-1.5 text-xs font-medium text-fg">
      {label && <Swatch color={inkFor(label).color} className="size-2 shrink-0" />}
      <span className="truncate">{node.known.map((e) => e.name).join(' lub ')}</span>
    </span>
  )
}

/** A short line between the two ends, its head where the relationship points. */
function Arrow({ phrase, both }: { phrase: string; both: boolean }) {
  const head = 'size-0 shrink-0 border-y-[4px] border-y-transparent'
  return (
    <span className="flex shrink-0 items-center text-xs text-fg-soft">
      {both && <span className={cn(head, 'border-r-[7px] border-r-fg')} />}
      <span className="h-px w-4 bg-fg" />
      <span className="px-1.5 whitespace-nowrap">{phrase}</span>
      <span className="h-px w-4 bg-fg" />
      <span className={cn(head, 'border-l-[7px] border-l-fg')} />
    </span>
  )
}

interface Props {
  source: PatternNode
  target: PatternNode
  phrase: string
  value: Direction
  onChange: (value: Direction) => void
}

/** The way a relationship points, drawn as the link it makes; flipped or made two-way by a click. */
export function DirectionPicker({ source, target, phrase, value, onChange }: Props) {
  // Drawn doer first: "in" is the target acting on the source.
  const [from, to] = value === 'in' ? [target, source] : [source, target]
  const both = value === 'any'
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      {/* Flipped or made two-way, the picture turns into the new one in place. */}
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div key={value} {...swap} className="flex min-w-0 items-center gap-2">
          <End node={from} />
          <Arrow phrase={phrase} both={both} />
          <End node={to} />
        </motion.div>
      </AnimatePresence>
      <div className="flex items-center gap-1">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onChange(value === 'in' ? 'out' : 'in')}
          title="Zamień strony relacji"
        >
          <RepeatIcon />
          Odwróć
        </Button>
        <Button
          size="sm"
          variant={both ? 'primary' : 'ghost'}
          aria-pressed={both}
          onClick={() => onChange(both ? 'out' : 'any')}
        >
          <ArrowLeftRightIcon />W obie strony
        </Button>
      </div>
    </div>
  )
}
