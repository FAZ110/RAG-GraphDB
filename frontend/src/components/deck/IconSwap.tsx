import type { ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { replace } from '@/design/motion'

export function IconSwap({ id, children }: { id: string; children: ReactNode }) {
  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.span key={id} {...replace} className="flex">
        {children}
      </motion.span>
    </AnimatePresence>
  )
}
