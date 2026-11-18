import type { ReactNode } from 'react'
import { IconButton, Kbd, Tooltip } from '@/components/deck'
import { cn } from '@/lib/utils'

interface Props {
  label: string
  /** A word under the icon where there is room, so the tools tell apart without hovering. */
  short?: string
  hotkey: string
  /** Why it can't be used now; the button stays reachable so the reason can be read. */
  unavailable?: string
  /** Waiting for entities to be picked on the canvas. */
  active?: boolean
  onClick: () => void
  children: ReactNode
}

export function ToolButton({
  label,
  short,
  hotkey,
  unavailable,
  active,
  onClick,
  children,
}: Props) {
  return (
    <Tooltip
      content={
        <>
          <span className="flex items-center gap-2">
            <span className="font-semibold">{label}</span>
            <Kbd tone="inverse">{hotkey}</Kbd>
          </span>
          {unavailable && <span className="block text-fg-inverse-muted">{unavailable}</span>}
        </>
      }
    >
      <IconButton
        label={label}
        title=""
        variant="ghost"
        size="icon-md"
        aria-disabled={Boolean(unavailable)}
        aria-pressed={active}
        onClick={() => !unavailable && onClick()}
        className={cn(
          short && 'sm:h-11 sm:w-auto sm:min-w-13 sm:flex-col sm:gap-1 sm:px-1.5',
          unavailable
            ? 'cursor-default text-fg-faint hover:text-fg-faint'
            : active && 'bg-fg text-fg-inverse hover:bg-fg-hover hover:text-fg-inverse'
        )}
      >
        {children}
        {short && (
          <span className="hidden text-[11px] leading-none font-medium sm:block">{short}</span>
        )}
      </IconButton>
    </Tooltip>
  )
}
