import { useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { coverFromEnd } from '@/design/motion'
import { Button } from './Button'

interface Props {
  open: boolean
  question: string
  error?: string | null
  confirmLabel?: string
  pending?: boolean
  onConfirm: () => void
  onCancel: () => void
  focusCancel?: boolean
}

export function InlineConfirm({
  open,
  question,
  error,
  confirmLabel = 'Usuń',
  pending = false,
  onConfirm,
  onCancel,
  focusCancel = false,
}: Props) {
  // Without preventScroll the frame scrolls to the off-screen strip and it skips its slide.
  const cancel = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (open && focusCancel) cancel.current?.focus({ preventScroll: true })
  }, [open, focusCancel])
  useEffect(() => {
    if (!open) return
    const escape = (e: KeyboardEvent) => e.key === 'Escape' && onCancel()
    document.addEventListener('keydown', escape)
    return () => document.removeEventListener('keydown', escape)
  }, [open, onCancel])
  return (
    // `clip`, unlike `hidden`, can't be scrolled to the strip while it slides in.
    <div
      data-confirm={open ? 'open' : 'closed'}
      className="pointer-events-none absolute inset-0 z-10 overflow-clip"
    >
      <AnimatePresence>
        {open && (
          <motion.div
            {...coverFromEnd}
            role="alertdialog"
            aria-label={question}
            className="pointer-events-auto absolute inset-y-0 right-0 flex items-center gap-2 pr-2"
          >
            {error && (
              <p role="alert" className="sr-only">
                {error}
              </p>
            )}
            <Button
              variant="danger"
              size="sm"
              title={error ?? undefined}
              disabled={pending}
              onClick={onConfirm}
            >
              {confirmLabel}
            </Button>
            <Button size="sm" ref={cancel} onClick={onCancel}>
              Anuluj
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
