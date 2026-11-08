import type { ReactNode } from 'react'
import { IconButton, Kbd, Tooltip } from '@/components/deck'

interface Props {
  label: string
  hotkey: string
  /** Why it can't be used now; the button stays reachable so the reason can be read. */
  unavailable?: string
  /** Waiting for entities to be picked on the canvas. */
  active?: boolean
  onClick: () => void
  children: ReactNode
}

export function ToolButton({ label, hotkey, unavailable, active, onClick, children }: Props) {
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
        className={
          unavailable
            ? 'cursor-default text-fg-faint hover:text-fg-faint'
            : active
              ? 'bg-fg text-fg-inverse hover:bg-fg-hover hover:text-fg-inverse'
              : undefined
        }
      >
        {children}
      </IconButton>
    </Tooltip>
  )
}
