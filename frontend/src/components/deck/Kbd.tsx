import type { ReactNode } from 'react'

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="hidden shrink-0 border border-line px-1.5 font-sans text-xs text-fg-subtle sm:inline">
      {children}
    </kbd>
  )
}
