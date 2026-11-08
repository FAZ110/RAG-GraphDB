import type { ReactNode } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { arrive } from '@/design/motion'

export function PageTransition({
  direction,
  children,
}: {
  direction: number
  children: ReactNode
}) {
  const reducedMotion = useReducedMotion()
  return (
    <motion.div
      custom={direction}
      variants={arrive}
      initial={direction && !reducedMotion ? 'enter' : false}
      animate="center"
    >
      {children}
    </motion.div>
  )
}
