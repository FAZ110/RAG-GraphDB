import { animate, useMotionValue, useReducedMotion, useTransform } from 'motion/react'
import type { MotionValue } from 'motion/react'
import { useEffect } from 'react'
import { STEP } from '../../story/timeline'
import { ITEMS } from './items'

/** One stop per capability; each adds its callout to the ones already there. */
export const TOUR_END = ITEMS.length
const STOP_SECONDS = 0.5
const LANDING_SECONDS = 0.15

/**
 * The capabilities are told one after another once their sheet has landed, on a clock rather
 * than on the scroll, so each one gets a moment of attention. Coming back from a later scene
 * finds the tour already done; leaving for an earlier one rewinds it for the next visit.
 */
export function useTour(step: number) {
  const reduced = useReducedMotion()
  const tour = useMotionValue(0)

  useEffect(() => {
    if (step < STEP.more) {
      const rewind = animate(tour, 0, { duration: 0.3 })
      return () => rewind.stop()
    }
    if (step > STEP.more || reduced) {
      tour.jump(TOUR_END)
      return
    }
    const left = TOUR_END - tour.get()
    if (left <= 0) return
    const run = animate(tour, TOUR_END, {
      duration: left * STOP_SECONDS,
      ease: 'linear',
      delay: tour.get() === 0 ? LANDING_SECONDS : 0,
    })
    return () => run.stop()
  }, [step, reduced, tour])

  return tour
}

/** How far a capability's callout has appeared. */
export function useReveal(tour: MotionValue<number>, index: number) {
  return useTransform(tour, [index, index + 0.7], [0, 1])
}
