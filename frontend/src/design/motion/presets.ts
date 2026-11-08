import type { Variants } from 'motion/react'
import { leave, move } from './transitions'

/** Content replacing other content in place. */
export const fade = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: move.base },
  exit: { opacity: 0, transition: leave.base },
}

/** A surface over the page, scaling from its `transform-origin`. */
export const pop = {
  initial: { opacity: 0, scale: 0.96 },
  animate: { opacity: 1, scale: 1, transition: move.base },
  exit: { opacity: 0, scale: 0.96, transition: leave.base },
}

/** A block opening below what it belongs to; give it `overflow-hidden`. */
export const reveal = {
  initial: { height: 0, opacity: 0 },
  animate: { height: 'auto', opacity: 1, transition: move.quick },
  exit: { height: 0, opacity: 0, transition: leave.quick },
}

/** One state turning into another; use `mode="popLayout"`, the blur blends the two. */
export const swap = {
  initial: { opacity: 0, y: 6, filter: 'blur(2px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)', transition: move.quick },
  exit: { opacity: 0, y: -6, filter: 'blur(2px)', transition: leave.quick },
}

/** An icon becoming another in place, like SF Symbols' replace; use `mode="popLayout"`. */
export const replace = {
  initial: { opacity: 0, scale: 0.6, filter: 'blur(2px)' },
  animate: { opacity: 1, scale: 1, filter: 'blur(0px)', transition: move.quick },
  exit: { opacity: 0, scale: 0.6, filter: 'blur(2px)', transition: leave.quick },
}

/** A solid strip sliding over a row from its end like a drawer; clip its frame. */
export const coverFromEnd = {
  initial: { x: '100%' },
  animate: { x: '0%', transition: move.quick },
  exit: { x: '100%', transition: leave.quick },
}

/** A strip sliding over a row from its end, and back there. */
export const slideFromEnd = {
  initial: { opacity: 0, x: 16 },
  animate: { opacity: 1, x: 0, transition: move.base },
  exit: { opacity: 0, x: 16, transition: leave.base },
}

/** A page settling in from its side of the rail, without a fade that would blank the screen. */
export const arrive: Variants = {
  enter: (direction: number) => ({ transform: `translateY(${direction * 16}px)` }),
  center: { transform: 'translateY(0px)', transition: move.quick },
}

/** One step of a flow replacing another: forward comes in from the end, back from the start.
 * Pass the direction, 1 or -1, as `custom` to both the step and its `AnimatePresence`. */
export const step: Variants = {
  enter: (direction: number) => ({ opacity: 0, transform: `translateX(${direction * 32}px)` }),
  center: { opacity: 1, transform: 'translateX(0px)', transition: move.base },
  exit: (direction: number) => ({
    opacity: 0,
    transform: `translateX(${direction * -32}px)`,
    transition: leave.base,
  }),
}
