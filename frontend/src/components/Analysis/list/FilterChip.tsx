import { Popover } from 'radix-ui'
import { ChevronDownIcon, XIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { focusRing } from '@/components/deck'
import { cn } from '@/lib/utils'

interface Props {
  label: string
  /** What it's set to, shown after the label; null when it lets everything through. */
  value: string | null
  onClear: () => void
  children: ReactNode
}

/** A filter that opens its options below it; once set it darkens and can be cleared at once. */
export function FilterChip({ label, value, onClear, children }: Props) {
  const on = value !== null
  return (
    <Popover.Root>
      <span
        className={cn(
          'flex h-9 items-center border bg-surface text-sm transition-colors',
          on ? 'border-fg text-fg' : 'border-line text-fg-muted hover:border-fg-subtle'
        )}
      >
        <Popover.Trigger asChild>
          <button type="button" className={cn('flex h-full items-center gap-1.5 px-3', focusRing)}>
            {label}
            {on && <span className="max-w-40 truncate font-semibold">{value}</span>}
            {!on && <ChevronDownIcon className="size-3.5" aria-hidden="true" />}
          </button>
        </Popover.Trigger>
        {on && (
          <button
            type="button"
            aria-label={`Wyczyść: ${label}`}
            onClick={onClear}
            className={cn(
              '-ml-1 flex h-full items-center pr-2 pl-1 text-fg-subtle hover:text-fg',
              focusRing
            )}
          >
            <XIcon className="size-3.5" />
          </button>
        )}
      </span>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={6}
          collisionPadding={12}
          className="deck z-50 w-64 animate-in border border-line bg-surface py-1 fade-in-0 zoom-in-95 spring-base"
        >
          {children}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
