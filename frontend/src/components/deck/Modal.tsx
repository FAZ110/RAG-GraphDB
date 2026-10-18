import type { CSSProperties, ReactNode } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Dialog } from 'radix-ui'
import { EASE_DECK } from '@/design/motion'
import { cn } from '@/lib/utils'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Read out when the modal opens; visually hidden, so the content shows its own heading. */
  title: string
  /** Screen point the modal grows from and shrinks back to, e.g. the button that opened it. */
  origin?: { x: number; y: number }
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
  origin,
  className,
  style,
  focusFirst = true,
  children,
}: Props) {
  const reducedMotion = useReducedMotion()
  const scale = reducedMotion ? 1 : 0.94

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-0 z-50 bg-fg/30"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              />
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
                // The origin is a screen point and transform-origin is relative to the box; the
                // offsets are its untransformed position, unaffected by the starting scale.
                ref={(el) => {
                  if (el && origin) {
                    el.style.transformOrigin = `${origin.x - el.offsetLeft}px ${origin.y - el.offsetTop}px`
                  }
                }}
                initial={{ opacity: 0, scale }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale }}
                transition={{ duration: 0.22, ease: EASE_DECK }}
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
