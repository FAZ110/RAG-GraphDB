import { Popover } from 'radix-ui'
import { CheckIcon, ChevronUpIcon, Wand2Icon } from 'lucide-react'
import { IconButton, focusRing } from '@/components/deck'
import { cn } from '@/lib/utils'
import { ToolButton } from './ToolButton'
import { TIDY_WAYS, tidyWay } from './tidyWay'

interface Props {
  label: string
  unavailable?: string
  onTidy: () => void
}

/** Tidy the canvas, with a switch beside it for which way to tidy. */
export function TidyButton({ label, unavailable, onTidy }: Props) {
  const way = tidyWay.useValue()

  return (
    <span className="flex items-center">
      <ToolButton label={label} hotkey="L" unavailable={unavailable} onClick={onTidy}>
        <Wand2Icon />
      </ToolButton>
      <Popover.Root>
        <Popover.Trigger asChild>
          <IconButton
            label="Sposób porządkowania"
            variant="ghost"
            size="icon-sm"
            className="-ml-1 w-5"
          >
            <ChevronUpIcon />
          </IconButton>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            side="top"
            align="end"
            sideOffset={10}
            collisionPadding={12}
            onCloseAutoFocus={(e) => e.preventDefault()}
            className="deck z-50 w-64 animate-in border border-line bg-surface py-1 fade-in-0 zoom-in-95 spring-base"
          >
            <p className="px-3 pt-1.5 pb-1 text-xs font-semibold text-fg-subtle">
              Sposób porządkowania
            </p>
            {TIDY_WAYS.map((w) => (
              <button
                key={w.way}
                type="button"
                role="menuitemradio"
                aria-checked={way === w.way}
                onClick={() => tidyWay.set(w.way)}
                className={cn(
                  'flex w-full items-start gap-2 px-3 py-1.5 text-left hover:bg-surface-sunken',
                  focusRing
                )}
              >
                <CheckIcon
                  className={cn('mt-0.5 size-3.5 shrink-0', way !== w.way && 'invisible')}
                  aria-hidden="true"
                />
                <span>
                  <span className="block text-sm font-medium text-fg">{w.name}</span>
                  <span className="block text-xs text-fg-subtle">{w.hint}</span>
                </span>
              </button>
            ))}
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </span>
  )
}
