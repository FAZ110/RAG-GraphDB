import { focusRing } from '@/components/deck/styles'
import { cn } from '@/lib/utils'
import { Letter } from './Letter'
import { useLetters } from './letters'
import { nodeTitle } from './names'
import type { PatternNode } from './pattern'

interface Props {
  sought: PatternNode[]
  value: string | null
  onChange: (key: string | null) => void
}

const chip = (on: boolean) =>
  cn(
    'inline-flex h-7 max-w-40 items-stretch border text-xs font-medium transition-colors spring-quick',
    on
      ? 'border-fg bg-fg text-fg-inverse'
      : 'border-line bg-surface text-fg-soft hover:border-fg hover:text-fg',
    focusRing
  )

/** Which sought node the matches gather round, or none; each named like its node in the drawing. */
export function GroupPicker({ sought, value, onChange }: Props) {
  const letters = useLetters()
  return (
    <div
      role="radiogroup"
      aria-label="Grupuj wyniki według"
      className="flex flex-wrap items-center gap-1.5 border-b border-line-soft px-5 py-3"
    >
      <span className="mr-1 text-xs text-fg-subtle">Grupuj wg</span>
      {sought.map((node) => {
        const on = value === node.key
        return (
          <button
            key={node.key}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(node.key)}
            className={chip(on)}
          >
            <span
              className={cn(
                'grid w-6 shrink-0 place-items-center border-r border-dashed',
                on ? 'border-fg-inverse-muted' : 'border-line bg-surface-sunken'
              )}
            >
              <Letter letter={letters.get(node.key) ?? ''} className="text-current" />
            </span>
            <span className="flex min-w-0 items-center px-2">
              <span className="truncate">{nodeTitle(node)}</span>
            </span>
          </button>
        )
      })}
      <button
        type="button"
        role="radio"
        aria-checked={value === null}
        onClick={() => onChange(null)}
        className={cn(chip(value === null), 'items-center px-2')}
      >
        Bez grup
      </button>
    </div>
  )
}
