import type { CSSProperties } from 'react'
import { inkFor } from '@/design/inks'
import { cn } from '@/lib/utils'
import type { Space } from '@/types'

// "Liga Mistrzów" → "LM", "Ekstraklasa 2026" → "EK": letters only, so years don't count.
function initials(name: string): string {
  const [first = '?', second] = name.match(/\p{L}+/gu) ?? []
  const letters = second ? first.charAt(0) + second.charAt(0) : first.slice(0, 2)
  return letters.toLocaleUpperCase('pl-PL')
}

export function SpaceMark({ space, size = 'md' }: { space: Space; size?: 'sm' | 'md' }) {
  const ink = inkFor(space.id)
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex shrink-0 items-center justify-center border-2 border-(--mark-ink) bg-(--mark-field) font-bold tracking-tight text-(--mark-ink) transition-colors group-hover:bg-(--mark-ink) group-hover:text-fg-inverse',
        size === 'md' ? 'size-10 text-sm' : 'size-8 text-xs'
      )}
      style={{ '--mark-ink': ink.color, '--mark-field': ink.field } as CSSProperties}
    >
      {initials(space.name)}
    </span>
  )
}
