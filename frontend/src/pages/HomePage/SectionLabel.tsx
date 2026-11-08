import type { ReactNode } from 'react'

export function SectionLabel({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <h2 className="text-[11px] font-semibold tracking-[0.22em] text-fg-faint uppercase">
        {children}
      </h2>
      {action}
    </div>
  )
}
