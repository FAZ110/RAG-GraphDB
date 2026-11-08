import type { ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Popover } from 'radix-ui'
import { pop } from '@/design/motion'
import { cn } from '@/lib/utils'
import { Button } from './Button'
import { ErrorNote } from './ErrorNote'
import { surface } from './styles'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: ReactNode
  question: string
  detail?: ReactNode
  error?: string | null
  confirmLabel?: string
  pending?: boolean
  onConfirm: () => void
  side?: 'top' | 'right' | 'bottom' | 'left'
  align?: 'start' | 'center' | 'end'
}

export function ConfirmPopover({
  open,
  onOpenChange,
  children,
  question,
  detail,
  error,
  confirmLabel = 'Usuń',
  pending = false,
  onConfirm,
  side = 'bottom',
  align = 'end',
}: Props) {
  return (
    <Popover.Root open={open} onOpenChange={onOpenChange}>
      <Popover.Trigger asChild>{children}</Popover.Trigger>
      <AnimatePresence>
        {open && (
          <Popover.Portal forceMount>
            <Popover.Content
              forceMount
              asChild
              side={side}
              align={align}
              sideOffset={8}
              collisionPadding={12}
              role="alertdialog"
              aria-label={question}
            >
              <motion.div
                {...pop}
                style={{ transformOrigin: 'var(--radix-popover-content-transform-origin)' }}
                className={cn(surface, 'z-60 flex w-80 max-w-[calc(100vw-1.5rem)] flex-col p-5')}
              >
                <p className="font-semibold break-words text-fg">{question}</p>
                {detail && <p className="mt-1 text-sm text-fg-muted">{detail}</p>}
                {error && (
                  <ErrorNote inline className="mt-2">
                    {error}
                  </ErrorNote>
                )}
                <div className="mt-5 flex justify-end gap-3">
                  <Button size="sm" onClick={() => onOpenChange(false)}>
                    Anuluj
                  </Button>
                  <Button size="sm" variant="danger" disabled={pending} onClick={onConfirm}>
                    {pending ? 'Usuwam…' : confirmLabel}
                  </Button>
                </div>
              </motion.div>
            </Popover.Content>
          </Popover.Portal>
        )}
      </AnimatePresence>
    </Popover.Root>
  )
}
