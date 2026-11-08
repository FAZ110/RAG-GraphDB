import { motion, useTransform } from 'motion/react'
import type { MotionValue } from 'motion/react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { into } from './timeline'

interface Props {
  progress: MotionValue<number>
  step: number
  className?: string
  children?: ReactNode
}

/** A full sheet dealt over everything before it on the way into `step`. */
export function Dealt({ progress, step, className, children }: Props) {
  const y = useTransform(progress, [into(step, 0), into(step, 0.6)], ['100%', '0%'])
  const visibility = useTransform(progress, (p) => (p > into(step, 0) ? 'visible' : 'hidden'))
  return (
    <motion.div
      className={cn(
        'absolute inset-0 overflow-clip border-t-4 border-fg will-change-transform',
        className
      )}
      style={{ y, visibility }}
    >
      {children}
    </motion.div>
  )
}
