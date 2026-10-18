import { StatCell } from '@/components/deck'
import { cn } from '@/lib/utils'
import { breakdown } from './breakdown'

const block = 'bg-surface-sunken'

// Mirrors the loaded stats' layout so the header keeps its height when they arrive.
export function StatsPlaceholder({ className }: { className: string }) {
  return (
    <div className={cn(className, 'animate-pulse')} aria-hidden="true">
      <StatCell figures={<span className={cn(block, 'h-6.5 w-28')} />}>
        <div className={cn(block, 'h-2.5')} />
        <div className={cn(block, breakdown, 'h-5 w-48')} />
      </StatCell>
      <StatCell figures={<span className={cn(block, 'h-6.5 w-44')} />}>
        <div className={cn(block, breakdown, 'h-5 w-40')} />
      </StatCell>
    </div>
  )
}
