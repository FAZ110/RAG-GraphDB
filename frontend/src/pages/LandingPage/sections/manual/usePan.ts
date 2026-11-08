import { animate, useMotionValue, useReducedMotion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'

/** Tailwind's `lg`, where a panel leaves room to see the next one. */
const WIDE = 1024
const WIDE_PANEL = 0.8
/** Quicker than the story's step, with a little give, like a page flicked along. */
const PAN = { type: 'spring', visualDuration: 0.75, bounce: 0.15 } as const
/** A jump across panels lands once the page has faded out for it (see useSteps). */
const JUMP_DELAY_MS = 150

function offset(index: number, count: number, width: number) {
  const panel = width >= WIDE ? width * WIDE_PANEL : width
  return -Math.min(index * panel, count * panel - width)
}

/**
 * How far the strip of panels has moved, in pixels. It follows the step on a spring of its own
 * rather than the story's progress, and lands at once when a jump skips panels.
 */
export function usePan(step: number, first: number, count: number) {
  const reduced = useReducedMotion()
  const [width, setWidth] = useState(() =>
    typeof window === 'undefined' ? WIDE : window.innerWidth
  )
  const index = Math.min(Math.max(step - first, 0), count - 1)
  const x = useMotionValue(offset(index, count, width))
  const sizedFor = useRef(width)

  useEffect(() => {
    const resize = () => setWidth(window.innerWidth)
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])

  useEffect(() => {
    const target = offset(index, count, width)
    const panel = Math.abs(offset(1, count, width))
    const far = Math.abs(target - x.get()) > panel * 1.5
    const resized = sizedFor.current !== width
    sizedFor.current = width
    if (reduced || resized) {
      x.jump(target)
      return
    }
    if (far) {
      const land = window.setTimeout(() => x.jump(target), JUMP_DELAY_MS)
      return () => window.clearTimeout(land)
    }
    const run = animate(x, target, PAN)
    return () => run.stop()
  }, [count, index, reduced, width, x])

  return x
}
