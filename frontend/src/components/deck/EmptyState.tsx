import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { dashedFrame } from './styles'

interface Props {
  title: string
  children?: ReactNode
  action?: ReactNode
  art?: ReactNode
  accent?: string
  framed?: boolean
  className?: string
}

export function EmptyState({
  title,
  children,
  action,
  art,
  accent,
  framed = true,
  className,
}: Props) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-4 px-6 py-10 text-center',
        framed && cn(dashedFrame, 'bg-surface/70'),
        className
      )}
      style={
        framed && accent
          ? { borderColor: `color-mix(in oklch, ${accent} 35%, transparent)` }
          : undefined
      }
    >
      {art}
      <div className="max-w-md min-w-0">
        <p className="text-lg font-semibold text-fg">{title}</p>
        {children && (
          <p className="mt-1 text-sm text-balance wrap-anywhere text-fg-subtle">{children}</p>
        )}
      </div>
      {action}
    </div>
  )
}
