import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface Props {
  children: ReactNode
  inline?: boolean
  className?: string
}

export function ErrorNote({ children, inline = false, className }: Props) {
  return (
    <p
      role="alert"
      className={cn(
        'text-sm',
        inline
          ? 'text-danger'
          : 'border-l-4 border-danger bg-danger-surface px-3 py-2 text-danger-strong',
        className
      )}
    >
      {children}
    </p>
  )
}
