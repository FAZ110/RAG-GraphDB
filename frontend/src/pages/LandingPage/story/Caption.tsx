import { motion, transform, useTransform } from 'motion/react'
import type { MotionValue } from 'motion/react'
import { Haze } from './Haze'
import type { Chapter } from './timeline'
import { into, STEP } from './timeline'

const OPACITY = [0, 1, 1, 0]

/** The colour of the sheet a chapter is told on (see Backdrop). */
const sheetOf = (step: number) =>
  step < STEP.graph
    ? 'var(--pastel-sky)'
    : step < STEP.canvas
      ? 'var(--pastel-lilac)'
      : 'var(--pastel-sand)'
const Y = [20, 0, 0, -24]

interface Props {
  chapter: Chapter
  progress: MotionValue<number>
  /** 1 while the story moves forward, -1 while it plays back. */
  heading: MotionValue<number>
}

export function Caption({ chapter, progress, heading }: Props) {
  const { step } = chapter
  // Either way, the words leave early in the move and the next ones settle mid-way, while the
  // drawing is still on its way; a mirrored timeline would bring them back only at the very end.
  const forward = [into(step, 0.22), into(step, 0.6), step, into(step + 1, 0.2)]
  const back = [into(step, 0.75), step, into(step + 1, 0.25), into(step + 1, 0.65)]
  const ways = {
    forward: { opacity: transform(forward, OPACITY), y: transform(forward, Y) },
    back: { opacity: transform(back, OPACITY), y: transform(back, Y) },
  }
  const way = () => (heading.get() < 0 ? ways.back : ways.forward)
  const opacity = useTransform(() => way().opacity(progress.get()))
  const y = useTransform(() => way().y(progress.get()))
  const visibility = useTransform(opacity, (o) => (o > 0 ? 'visible' : 'hidden'))
  return (
    <motion.div
      className="absolute inset-x-0 top-0 isolate will-change-transform lg:top-1/2 lg:-translate-y-1/2"
      style={{ y, visibility, ['--slide' as string]: sheetOf(step) }}
    >
      <Haze opacity={opacity} />
      <motion.div
        className="flex flex-col gap-3 text-fg will-change-[opacity] lg:gap-5"
        style={{ opacity }}
      >
        <h2 className="text-chapter whitespace-pre-line">{chapter.title}</h2>
        <p className="text-base text-pretty text-fg-soft sm:text-lg">{chapter.body}</p>
      </motion.div>
    </motion.div>
  )
}
