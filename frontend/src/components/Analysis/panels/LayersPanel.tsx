import { EyeIcon, EyeOffIcon } from 'lucide-react'
import { IconButton, Swatch, focusRing } from '@/components/deck'
import { ENTITY_FORMS, pluralForm, typeName } from '@/components/Spaces/spaceText'
import { FloatingPanel } from '@/components/workspace/FloatingPanel'
import { inkFor } from '@/design/inks'
import { cn } from '@/lib/utils'
import type { LabelCount } from '@/types/analysis'

interface Props {
  types: LabelCount[]
  total: number
  hidden: ReadonlySet<string>
  onToggle: (label: string) => void
  onSelectType: (label: string) => void
}

export function LayersPanel({ types, total, hidden, onToggle, onSelectType }: Props) {
  return (
    <FloatingPanel
      title="Legenda"
      aside={
        <span className="text-xs text-fg-subtle tabular-nums">
          {total} {pluralForm(total, ENTITY_FORMS)}
        </span>
      }
    >
      <ul className="py-1">
        {types.map(({ label, count }) => {
          const off = hidden.has(label)
          return (
            <li key={label} className="group flex items-center gap-1 pr-1">
              <button
                type="button"
                onClick={() => onSelectType(label)}
                title={`Zaznacz: ${typeName(label)}`}
                className={cn(
                  'flex min-w-0 flex-1 items-center gap-2 py-1.5 pl-3 text-left text-sm hover:bg-surface-sunken',
                  off ? 'text-fg-faint' : 'text-fg-soft',
                  focusRing
                )}
              >
                <Swatch
                  color={off ? 'var(--line)' : inkFor(label).color}
                  className="rounded-full"
                />
                <span className="min-w-0 flex-1 truncate">{typeName(label)}</span>
                <span className="text-xs text-fg-subtle tabular-nums">{count}</span>
              </button>
              <IconButton
                variant="ghost"
                size="icon-sm"
                label={off ? `Pokaż: ${typeName(label)}` : `Ukryj: ${typeName(label)}`}
                onClick={() => onToggle(label)}
                className={cn(
                  'size-7',
                  !off && 'opacity-0 group-hover:opacity-100 focus-visible:opacity-100'
                )}
              >
                {off ? <EyeOffIcon /> : <EyeIcon />}
              </IconButton>
            </li>
          )
        })}
      </ul>
    </FloatingPanel>
  )
}
