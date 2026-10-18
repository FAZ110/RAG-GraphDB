import type { ReactNode } from 'react'

interface Props {
  figures: ReactNode
  children?: ReactNode
}

export function StatCell({ figures, children }: Props) {
  return (
    <div className="flex min-w-0 flex-col gap-2.5 bg-surface px-5 py-4">
      <div className="flex flex-wrap items-baseline gap-x-5 gap-y-2">{figures}</div>
      {children}
    </div>
  )
}
