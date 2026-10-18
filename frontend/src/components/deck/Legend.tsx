import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Swatch } from './Swatch'

export function Legend({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <ul className={cn('flex flex-wrap gap-x-3 gap-y-1 text-sm text-fg-muted', className)}>
      {children}
    </ul>
  )
}

export function LegendItem({ color, children }: { color: string; children: ReactNode }) {
  return (
    <li className="flex items-center gap-1.5">
      <Swatch color={color} />
      {children}
    </li>
  )
}
