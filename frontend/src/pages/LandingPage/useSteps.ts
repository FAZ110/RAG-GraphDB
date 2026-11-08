import { animate, useMotionValue, useReducedMotion } from 'motion/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { STAGED_STEP, STAGED_STEP_BACK } from '@/design/motion'
import { wheelSteps } from './wheelSteps'

const FORWARD_KEYS = ['ArrowDown', 'ArrowRight', 'PageDown']
const BACK_KEYS = ['ArrowUp', 'ArrowLeft', 'PageUp']
/** Further than this from the moving story, a step is a jump or a fast run, not the next scene. */
const CHASE_LIMIT = 1.5
const FADE_OUT = { duration: 0.14, ease: 'easeIn' } as const
const FADE_IN = { duration: 0.32, ease: 'easeOut' } as const

/**
 * The page moves one whole scene per gesture: touch through the browser's scroll snapping, a wheel
 * or trackpad through `wheelSteps`. A step to the neighbouring scene plays it, either way, chasing
 * it on a spring so the next gesture takes over from the moving scene. Jumps, and steps that race
 * ahead of the story, cut instead: the stage fades out, lands on the target scene at rest and fades
 * back, so no scene plays on the way.
 */
export function useSteps(last: number) {
  const reduced = useReducedMotion()
  const progress = useMotionValue(0)
  const stage = useMotionValue(1)
  const heading = useMotionValue(1)
  const scroller = useRef<HTMLDivElement>(null)
  const [step, setStep] = useState(0)
  const current = useRef(0)

  const goTo = useCallback(
    (target: number) => {
      const el = scroller.current
      if (!el) return
      const next = Math.max(0, Math.min(last, target))
      el.scrollTo({ top: next * el.clientHeight, behavior: 'instant' })
    },
    [last]
  )

  useEffect(() => {
    const el = scroller.current
    if (!el) return
    let moving: ReturnType<typeof animate> | undefined
    let fading: ReturnType<typeof animate> | undefined
    let cut = 0

    const play = (next: number) => {
      cut++
      if (stage.get() < 1) fading = animate(stage, 1, FADE_IN)
      const back = next < progress.get()
      heading.set(back ? -1 : 1)
      moving = animate(progress, next, back ? STAGED_STEP_BACK : STAGED_STEP)
    }

    const jump = (next: number) => {
      const id = ++cut
      fading = animate(stage, 0, { ...FADE_OUT, duration: FADE_OUT.duration * stage.get() })
      fading.then(() => {
        if (id !== cut) return
        progress.set(next)
        fading = animate(stage, 1, FADE_IN)
      })
    }

    const onScroll = () => {
      const next = Math.round(el.scrollTop / el.clientHeight)
      if (next === current.current) return
      current.current = next
      setStep(next)
      moving?.stop()
      fading?.stop()
      if (reduced) {
        cut++
        stage.set(1)
        progress.set(next)
      } else if (Math.abs(next - progress.get()) <= CHASE_LIMIT) play(next)
      else jump(next)
    }

    const steps = wheelSteps()
    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      const horizontal = Math.abs(event.deltaX) > Math.abs(event.deltaY)
      const direction = steps(horizontal ? event.deltaX : event.deltaY, performance.now())
      if (direction !== 0) goTo(current.current + direction)
    }

    const onKey = (event: KeyboardEvent) => {
      if (event.repeat) return
      if (FORWARD_KEYS.includes(event.key)) goTo(current.current + 1)
      else if (BACK_KEYS.includes(event.key)) goTo(current.current - 1)
      else if (event.key === 'Home') goTo(0)
      else if (event.key === 'End') goTo(last)
      else return
      event.preventDefault()
    }

    el.addEventListener('scroll', onScroll, { passive: true })
    el.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('keydown', onKey)
    return () => {
      moving?.stop()
      fading?.stop()
      el.removeEventListener('scroll', onScroll)
      el.removeEventListener('wheel', onWheel)
      window.removeEventListener('keydown', onKey)
    }
  }, [goTo, heading, last, progress, reduced, stage])

  return { step, progress, heading, stage, goTo, scroller }
}
