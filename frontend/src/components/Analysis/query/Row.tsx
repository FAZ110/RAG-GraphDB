import type { ReactNode } from 'react'

/** One setting in the strip: its name on the left, its controls beside it. */
export function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[8rem_1fr] items-start gap-3">
      <span className="pt-1.5 text-xs text-fg-subtle">{label}</span>
      <div className="min-w-0">{children}</div>
    </div>
  )
}
