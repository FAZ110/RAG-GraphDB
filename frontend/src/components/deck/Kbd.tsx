import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface Props {
  /** `inverse` sits on the dark band, e.g. in a tooltip. */
  tone?: 'default' | 'inverse'
  children: ReactNode
}

export function Kbd({ tone = 'default', children }: Props) {
  return (
    <kbd
      className={cn(
        'hidden shrink-0 border font-sans sm:inline',
        tone === 'inverse'
          ? 'border-fg-inverse-muted/40 px-1 text-[0.6875rem] leading-4 text-fg-inverse-muted'
          : 'border-line px-1.5 text-xs text-fg-subtle'
      )}
    >
      {children}
    </kbd>
  )
}
