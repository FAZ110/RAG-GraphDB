import { motion } from 'motion/react'
import { focusRing } from '@/components/deck'
import { move } from '@/design/motion'
import { cn } from '@/lib/utils'
import type { SearchScope } from './searchResults'

interface Props {
  scopes: { scope: SearchScope; name: string }[]
  scope: SearchScope
  onChange: (scope: SearchScope) => void
}

/** What the search looks through: everything, or one kind of thing. */
export function SearchScopes({ scopes, scope, onChange }: Props) {
  return (
    <div role="tablist" aria-label="Czego szukać" className="flex items-center gap-4 px-3">
      {scopes.map((s) => (
        <button
          key={s.scope}
          type="button"
          role="tab"
          aria-selected={scope === s.scope}
          // The field keeps focus, so typing carries on in the new scope.
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onChange(s.scope)}
          className={cn(
            'relative h-9 text-xs font-semibold transition-colors',
            scope === s.scope ? 'text-fg' : 'text-fg-subtle hover:text-fg-muted',
            focusRing
          )}
        >
          {s.name}
          {scope === s.scope && (
            <motion.span
              layoutId="dock-search-scope"
              className="absolute inset-x-0 bottom-0 h-0.5 bg-fg"
              transition={move.quick}
            />
          )}
        </button>
      ))}
    </div>
  )
}
