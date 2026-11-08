import { motion } from 'motion/react'
import type { MotionValue } from 'motion/react'

/**
 * Lets the contour lines fade out behind a block of text, in the colour of the slide it sits on.
 * It follows the text's own fade, so it is a sibling given the same opacity.
 */
export function Haze({ opacity }: { opacity?: MotionValue<number> }) {
  return (
    <motion.div
      aria-hidden="true"
      className="haze pointer-events-none absolute -inset-x-10 -inset-y-8 -z-10"
      style={{ opacity }}
    />
  )
}
