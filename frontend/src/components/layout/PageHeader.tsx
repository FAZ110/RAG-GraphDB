import type { ReactNode } from 'react'

interface Props {
  title: string
  children?: ReactNode
  action?: ReactNode
}

export function PageHeader({ title, children, action }: Props) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-2xl">
        <h1 className="text-display text-fg @md:text-display-lg">{title}</h1>
        {children && <p className="mt-2 text-fg-muted">{children}</p>}
      </div>
      {action}
    </header>
  )
}
