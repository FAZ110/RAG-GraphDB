import type { CSSProperties, ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Dialog } from 'radix-ui'
import { fade, pop } from '@/design/motion'
import { cn } from '@/lib/utils'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Read out when the modal opens; visually hidden, so the content shows its own heading. */
  title: string
  className?: string
  style?: CSSProperties
  /**
   * Focus the first control on opening; off, the sheet itself takes focus, e.g. when that
   * control is a dropdown the opening key would also open.
   */
  focusFirst?: boolean
  children: ReactNode
}

export function Modal({
  open,
  onOpenChange,
  title,
  className,
  style,
  focusFirst = true,
  children,
}: Props) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div {...fade} className="fixed inset-0 z-50 bg-fg/30" />
            </Dialog.Overlay>
            <Dialog.Content
              asChild
              forceMount
              aria-describedby={undefined}
              onOpenAutoFocus={(e) => {
                if (focusFirst) return
                e.preventDefault()
                const sheet = e.currentTarget as HTMLElement
                sheet.focus()
              }}
            >
              <motion.div
                className={cn(
                  'deck-lg fixed z-50 flex flex-col border border-line bg-surface outline-none',
                  className
                )}
                style={style}
                // Centred in the viewport, so it scales from its own centre.
                {...pop}
              >
                <Dialog.Title className="sr-only">{title}</Dialog.Title>
                {children}
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  )
}
