import { easeInOut, motion, useMotionTemplate, useTransform } from 'motion/react'
import type { MotionValue } from 'motion/react'
import { useLayoutEffect, useRef, useState } from 'react'
import { into, STEP } from '../timeline'
import type { Entity } from './data'
import { LINES } from './data'
import type { WordBox } from './Paper'

const HEIGHT = 62
const PAD = 16
const LABEL_SIZE = 30

const lerp = (from: number, to: number, share: number) => from + (to - from) * share

interface Props {
  entity: Entity
  index: number
  box: WordBox | undefined
  progress: MotionValue<number>
  x: MotionValue<number>
  y: MotionValue<number>
}

function revealTimes(entity: Entity, index: number) {
  if (!entity.word)
    return [into(STEP.path, 0.3 + index * 0.05), into(STEP.path, 0.5 + index * 0.05)]
  const reached = into(STEP.read, 0.5 + ((entity.line + 0.5) / LINES.length) * 0.45)
  return [reached - 0.04, reached + 0.04]
}

/** A name marked on the paper; the same object then flies off and stays on as a graph node. */
export function EntityChip({ entity, index, box, progress, x, y }: Props) {
  const label = useRef<SVGTextElement>(null)
  const [labelWidth, setLabelWidth] = useState(box?.width ?? 0)
  useLayoutEffect(() => {
    if (label.current) setLabelWidth(label.current.getComputedTextLength())
  }, [])

  const reveal = useTransform(progress, revealTimes(entity, index), [0, 1])
  const start = entity.word ? into(STEP.graph, 0.05 + index * 0.02) : -2
  const lift = useTransform(progress, [start, start + 0.4], [0, 1], { ease: easeInOut })
  const wordWidth = (box?.width ?? labelWidth) + PAD
  const namedWidth = labelWidth + PAD * 2
  const width = useTransform(
    [reveal, lift],
    ([r, l]: number[]) => r * lerp(wordWidth, namedWidth, l)
  )
  const left = useTransform(lift, (l) => -lerp(wordWidth, namedWidth, l) / 2)
  const shadow = useTransform(lift, [0, 1], [0, 6])
  const wordOpacity = useTransform(lift, [0, 0.4], [1, 0])
  const nameOpacity = useTransform(lift, [0.4, 0.8], [0, 1])
  const place = useMotionTemplate`translate(${x}px, ${y}px)`
  const stay = useTransform(
    progress,
    [into(STEP.canvas, 0.2), into(STEP.canvas, 0.4)],
    [1, entity.offCanvas ? 0 : 1]
  )

  return (
    <motion.g
      style={{ transform: place, transformBox: 'view-box', transformOrigin: '0 0', opacity: stay }}
    >
      <motion.rect
        x={left}
        y={-HEIGHT / 2}
        width={width}
        height={HEIGHT}
        style={{
          fill: `var(--ink-${entity.ink})`,
          translateX: shadow,
          translateY: shadow,
          opacity: lift,
        }}
      />
      <motion.rect
        x={left}
        y={-HEIGHT / 2}
        width={width}
        height={HEIGHT}
        strokeWidth={3}
        style={{ fill: `var(--ink-${entity.ink}-field)`, stroke: `var(--ink-${entity.ink})` }}
      />
      <motion.g style={{ opacity: reveal }}>
        {entity.word && (
          <motion.text
            textAnchor="middle"
            y={14}
            fontSize={40}
            fontWeight={500}
            style={{ fill: `var(--ink-${entity.ink})`, opacity: wordOpacity }}
          >
            {entity.word}
          </motion.text>
        )}
        <motion.text
          ref={label}
          textAnchor="middle"
          y={12}
          fontSize={LABEL_SIZE}
          fontWeight={600}
          style={{ fill: `var(--ink-${entity.ink})`, opacity: nameOpacity }}
        >
          {entity.name}
        </motion.text>
      </motion.g>
    </motion.g>
  )
}
