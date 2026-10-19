import type { ReactNode } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import type { Variants } from 'motion/react'
import { EASE_DECK } from '@/design/motion'
import { usePageDirection } from './pageDirection'

const SHIFT = 28

// A page comes in from where it sits on the rail, below or above, and the old one leaves the
// other way.
const variants: Variants = {
  enter: (direction: number) => ({ opacity: 0, y: direction * SHIFT }),
  center: { opacity: 1, y: 0, transition: { duration: 0.32, ease: EASE_DECK } },
  exit: (direction: number) => ({
    opacity: 0,
    y: direction * -SHIFT,
    transition: { duration: 0.16, ease: 'easeIn' },
  }),
}

export function PageTransition({ children }: { children: ReactNode }) {
  const direction = usePageDirection()
  const reducedMotion = useReducedMotion()
  return (
    <motion.div
      custom={reducedMotion ? 0 : direction}
      variants={variants}
      initial="enter"
      animate="center"
      exit="exit"
    >
      {children}
    </motion.div>
  )
}
