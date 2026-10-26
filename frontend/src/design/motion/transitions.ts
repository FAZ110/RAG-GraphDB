import type { Transition } from 'motion/react'
import { EFFECT_SHARE, EXIT_SHARE, SPRINGS, SPRING_NAMES, STAGGER } from './springs'
import type { SpringName } from './springs'

function spring(name: SpringName, share: number): Transition {
  const { visualDuration, bounce } = SPRINGS[name]
  const duration = visualDuration * share
  return {
    type: 'spring',
    visualDuration: duration,
    bounce,
    opacity: { type: 'spring', visualDuration: duration * EFFECT_SHARE, bounce: 0 },
  }
}

const bySpring = (share: number) =>
  Object.fromEntries(SPRING_NAMES.map((name) => [name, spring(name, share)])) as Record<
    SpringName,
    Transition
  >

/** Toward something visible: appearing, moving, resizing. */
export const move = bySpring(1)

/** Toward removal, quicker than `move`. */
export const leave = bySpring(EXIT_SHARE)

export const staggerDelay = (index: number) => Math.min(index, STAGGER.upTo) * STAGGER.gap
