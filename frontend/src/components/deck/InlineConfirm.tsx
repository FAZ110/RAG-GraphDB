import { AnimatePresence, motion } from 'motion/react'
import { slideFromEnd } from '@/design/motion'
import { cn } from '@/lib/utils'
import { Button } from './Button'

interface Props {
  open: boolean
  question: string
  detail?: string
  error?: string | null
  confirmLabel?: string
  pending?: boolean
  onConfirm: () => void
  onCancel: () => void
  className?: string
}

export function InlineConfirm({
  open,
  question,
  detail,
  error,
  confirmLabel = 'Usuń',
  pending = false,
  onConfirm,
  onCancel,
  className,
}: Props) {
  const second = error ?? detail
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          {...slideFromEnd}
          role="alertdialog"
          aria-label={question}
          onKeyDown={(e) => e.key === 'Escape' && onCancel()}
          className={cn(
            'absolute inset-0 z-10 flex items-center gap-3 border-l-4 border-danger bg-danger-surface pr-2 pl-4',
            className
          )}
        >
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-danger-fg">{question}</p>
            {second && <p className="truncate text-xs text-danger-strong">{second}</p>}
          </div>
          <Button variant="danger" size="sm" disabled={pending} onClick={onConfirm}>
            {confirmLabel}
          </Button>
          <Button variant="ghost-danger" size="sm" className="px-2" autoFocus onClick={onCancel}>
            Anuluj
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
