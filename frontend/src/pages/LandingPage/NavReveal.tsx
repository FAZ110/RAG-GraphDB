import { motion } from 'motion/react'
import type { ReactNode } from 'react'
import { SPRINGS, STAGGER } from '@/design/motion'

interface Props {
  shown: boolean
  /** The side it slides in from, in pixels: negative from the left. */
  from: number
  order?: number
  className?: string
  children: ReactNode
}

/** A control of the top bar that steps aside on scenes that carry their own. */
export function NavReveal({ shown, from, order = 0, className, children }: Props) {
  return (
    <motion.div
      className={className}
      inert={!shown}
      initial={false}
      animate={
        shown
          ? { opacity: 1, x: 0, visibility: 'visible' }
          : { opacity: 0, x: from, transitionEnd: { visibility: 'hidden' } }
      }
      transition={{ ...SPRINGS.base, delay: shown ? order * STAGGER.gap : 0 }}
    >
      {children}
    </motion.div>
  )
}
