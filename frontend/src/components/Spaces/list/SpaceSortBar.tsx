import { ArrowDownWideNarrowIcon } from 'lucide-react'
import { motion } from 'motion/react'
import { focusRing } from '@/components/deck'
import { move } from '@/design/motion'
import { cn } from '@/lib/utils'
import type { SpaceSort } from '../spaceSearch'

const SORTS: { value: SpaceSort; label: string; title: string }[] = [
  {
    value: 'own',
    label: 'Domyślnie',
    title: 'Nowe przestrzenie na górze, pozostałe w układzie z przeciągania',
  },
  { value: 'articles', label: 'Artykuły', title: 'Od największej liczby artykułów' },
  { value: 'entities', label: 'Encje', title: 'Od największej liczby encji' },
]

interface Props {
  sort: SpaceSort
  onSortChange: (sort: SpaceSort) => void
  className?: string
}

/** The list's header: which order its rows are in. */
export function SpaceSortBar({ sort, onSortChange, className }: Props) {
  return (
    <div
      role="group"
      aria-label="Kolejność przestrzeni"
      className={cn(
        'flex h-9 shrink-0 items-center gap-4 border-t border-line bg-surface-sunken pr-3 pl-5 text-sm',
        className
      )}
    >
      <ArrowDownWideNarrowIcon className="size-4 text-fg-faint" aria-hidden="true" />
      {SORTS.map(({ value, label, title }) => {
        const active = sort === value
        return (
          <button
            key={value}
            type="button"
            aria-pressed={active}
            title={title}
            onClick={() => onSortChange(value)}
            className={cn(
              'relative flex h-full items-center transition-colors',
              active ? 'font-semibold text-fg' : 'text-fg-subtle hover:text-fg',
              focusRing
            )}
          >
            {label}
            {active && (
              <motion.span
                layoutId="space-sort"
                className="absolute inset-x-0 bottom-0 h-0.5 bg-fg"
                transition={move.quick}
              />
            )}
          </button>
        )
      })}
    </div>
  )
}
