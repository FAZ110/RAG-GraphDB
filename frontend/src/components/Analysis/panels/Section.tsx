import type { ReactNode } from 'react'

export function Section({
  title,
  aside,
  children,
}: {
  title: string
  aside?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="border-t border-line-soft first:border-t-0">
      <h3 className="flex items-baseline justify-between px-3 pt-2.5 pb-1 text-xs font-semibold text-fg-subtle">
        {title}
        {aside && <span className="font-normal tabular-nums">{aside}</span>}
      </h3>
      {children}
    </div>
  )
}
