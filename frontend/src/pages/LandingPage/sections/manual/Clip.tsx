import { useReducedMotion } from 'motion/react'
import { useEffect, useRef } from 'react'

interface Props {
  /** File name in public/landing/manual: an .mp4 clip and a .jpg poster of its first frame. */
  name: string
  label: string
  active: boolean
  /** The manual is on screen or one step away, so the clip may load. */
  near: boolean
}

/** Playback waits for the panel to nearly stop, so decoding never competes with the slide. */
const START_DELAY_MS = 350
/** A clip rewinds once its panel has slid away, so it never jumps while in view. */
const REWIND_DELAY_MS = 800

/** A recording of the real app, playing only while its step is on screen. */
export function Clip({ name, label, active, near }: Props) {
  const video = useRef<HTMLVideoElement>(null)
  const reduced = useReducedMotion()

  useEffect(() => {
    const el = video.current
    if (!el) return
    if (!active || reduced) {
      el.pause()
      const rewind = window.setTimeout(() => {
        el.currentTime = 0
      }, REWIND_DELAY_MS)
      return () => window.clearTimeout(rewind)
    }
    const start = window.setTimeout(() => el.play().catch(() => {}), START_DELAY_MS)
    return () => window.clearTimeout(start)
  }, [active, reduced])

  return (
    <figure className="deck-lg relative m-0 aspect-[8/5] w-full overflow-hidden border-2 border-fg bg-surface [--deck-shadow:var(--fg)]">
      <video
        ref={video}
        className="size-full object-cover"
        src={`/landing/manual/${name}.mp4`}
        poster={`/landing/manual/${name}.jpg`}
        aria-label={label}
        preload={near ? 'auto' : 'none'}
        muted
        loop
        playsInline
      />
    </figure>
  )
}
