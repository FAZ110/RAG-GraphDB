import type { ReactNode } from 'react'

// The name beside a rail icon; put it in a `group relative` control.
export function Flyout({ children }: { children: ReactNode }) {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute top-1/2 left-full z-30 ml-6 hidden -translate-y-1/2 items-center gap-2 border border-fg bg-fg px-2 py-1 text-xs font-semibold whitespace-nowrap text-fg-inverse opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 sm:flex"
    >
      {children}
    </span>
  )
}
