import type { CSSProperties } from 'react'
import { inkTint } from '@/design/inks'
import type { Ink } from '@/design/inks'
import { cn } from '@/lib/utils'

const sheet =
  'absolute inset-0 border bg-surface transition-transform duration-300 ease-deck motion-reduce:transition-none'

export function ArticleStack({
  ink,
  open,
  className,
}: {
  ink: Ink
  open: boolean
  className?: string
}) {
  const line = { backgroundColor: inkTint(ink, 30) }
  return (
    <div
      aria-hidden="true"
      className={cn('relative h-28 w-24 shrink-0', className)}
      style={{ '--deck-shadow': ink.color } as CSSProperties}
    >
      <div
        className={sheet}
        style={{
          borderColor: inkTint(ink, 40),
          transform: open
            ? 'rotate(-14deg) translate(-14px, 4px)'
            : 'rotate(-8deg) translate(-4px, 2px)',
        }}
      />
      <div
        className={sheet}
        style={{
          borderColor: inkTint(ink, 55),
          transform: open
            ? 'rotate(10deg) translate(14px, 2px)'
            : 'rotate(6deg) translate(4px, 1px)',
        }}
      />
      <div
        className={cn(sheet, 'deck flex flex-col gap-2 p-3')}
        style={{
          borderColor: ink.color,
          transform: open ? 'translateY(-12px)' : undefined,
        }}
      >
        <span className="h-2 w-3/4" style={{ backgroundColor: ink.color }} />
        <span className="h-1.5 w-full" style={line} />
        <span className="h-1.5 w-full" style={line} />
        <span className="h-1.5 w-5/6" style={line} />
        <span className="h-1.5 w-2/3" style={line} />
      </div>
    </div>
  )
}
