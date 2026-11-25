import { focusRing } from '@/components/deck/styles'
import { typeName } from '@/components/Spaces/spaceText'
import { inkFor } from '@/design/inks'
import { cn } from '@/lib/utils'
import type { LoadedNode } from '@/types'
import { Letter } from './Letter'
import { countedText, countUnit } from './counting'
import type { PatternNode } from './pattern'

interface Props {
  node: PatternNode
  letter: string
  /** Null where an optional link is missing. */
  entity: LoadedNode | null
  /** What the node's count came to for this entity, when it has one. */
  tally: number | undefined
  onPick: (id: string) => void
  /** The entity a group gathers round, drawn larger and raised. */
  hub?: boolean
  className?: string
}

/** One entity of a match as a small node of the drawing: the letter of the node it stands for
 * in the dashed cell a sought node has, the name inked by its type. Opens its details. */
export function MatchEntity({
  node,
  letter,
  entity,
  tally,
  onPick,
  hub = false,
  className,
}: Props) {
  const cell = cn('grid shrink-0 place-items-center border-r border-dashed', hub ? 'w-8' : 'w-6')
  if (!entity)
    return (
      <span
        className={cn(
          'inline-flex items-stretch border border-dashed border-line text-fg-faint',
          hub ? 'h-10' : 'h-8',
          className
        )}
      >
        <span className={cn(cell, 'border-line')}>
          <Letter letter={letter} className="text-xs text-fg-faint" />
        </span>
        <span className="flex items-center px-2 text-sm">brak</span>
      </span>
    )
  const ink = inkFor(entity.label)
  return (
    <button
      type="button"
      title={`${entity.name} · ${typeName(entity.label)}`}
      onClick={() => onPick(entity.id)}
      className={cn(
        'inline-flex max-w-full min-w-0 items-stretch border text-left transition-shadow spring-quick',
        hub
          ? 'h-10 shadow-[3px_3px_0_var(--fg)]'
          : 'h-8 group-hover/match:shadow-[2px_2px_0_var(--fg)] hover:shadow-[2px_2px_0_var(--fg)]',
        focusRing,
        className
      )}
      style={{ borderColor: ink.color, background: ink.field }}
    >
      <span className={cn(cell, 'bg-surface')} style={{ borderColor: ink.color }}>
        <Letter letter={letter} className={hub ? 'text-sm text-fg' : 'text-xs text-fg-soft'} />
      </span>
      <span className="flex min-w-0 items-center gap-2 px-2.5">
        <span
          className={cn('truncate font-semibold', hub ? 'text-[15px]' : 'text-sm')}
          style={{ color: ink.color }}
        >
          {entity.name}
        </span>
        {node.linkCount && tally !== undefined && (
          <span
            className="shrink-0 text-xs text-fg-subtle tabular-nums"
            title={countedText(node.linkCount, tally)}
          >
            {tally} {countUnit(node.linkCount, tally)}
          </span>
        )}
      </span>
    </button>
  )
}
