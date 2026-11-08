import { motion, useTransform } from 'motion/react'
import type { MotionValue } from 'motion/react'
import { useLayoutEffect, useRef } from 'react'
import { into, OFFSTAGE, STEP } from '../timeline'
import { ENTITIES, LINES } from './data'

const PAPER = { x: 130, y: 110, width: 740, height: 780 }
const LINE_START = 360
const LINE_GAP = 62
const TEXT_X = 180

export interface WordBox {
  x: number
  y: number
  width: number
}

interface Props {
  progress: MotionValue<number>
  onMeasure: (boxes: Record<string, WordBox>) => void
}

export function Paper({ progress, onMeasure }: Props) {
  const lines = useRef<Array<SVGTextElement | null>>([])
  const scale = useTransform(progress, [into(STEP.read, 0.15), into(STEP.read, 0.5)], [0.43, 1])
  const fade = useTransform(progress, [into(STEP.read, 0.1), into(STEP.read, 0.3)], [0, 1])
  const y = useTransform(
    progress,
    [into(STEP.graph, 0.2), into(STEP.graph, 0.75)],
    ['0%', `${OFFSTAGE / 10}%`]
  )
  const rotate = useTransform(progress, [into(STEP.graph, 0.2), into(STEP.graph, 0.75)], [0, 8])
  const visibility = useTransform(progress, (p) =>
    p > into(STEP.read, 0.05) && p < into(STEP.graph, 0.8) ? 'visible' : 'hidden'
  )
  const scanTimes = [into(STEP.read, 0.5), into(STEP.read, 0.95)]
  const scanY = useTransform(progress, scanTimes, [300, 690])
  const scanOpacity = useTransform(
    progress,
    [scanTimes[0], scanTimes[1] - 0.02, scanTimes[1]],
    [1, 1, 0]
  )

  useLayoutEffect(() => {
    const boxes: Record<string, WordBox> = {}
    for (const entity of ENTITIES) {
      const text = lines.current[entity.line]
      if (!text || !entity.word) continue
      const start = LINES[entity.line].indexOf(entity.word)
      const from = text.getStartPositionOfChar(start)
      const to = text.getEndPositionOfChar(start + entity.word.length - 1)
      boxes[entity.id] = { x: from.x, y: from.y, width: to.x - from.x }
    }
    onMeasure(boxes)
  }, [onMeasure])

  return (
    <motion.svg
      viewBox="0 0 1000 1000"
      aria-hidden="true"
      className="absolute inset-0 size-full overflow-visible will-change-transform [text-rendering:geometricPrecision]"
      style={{ y, rotate, scale, opacity: fade, visibility }}
    >
      <rect
        x={PAPER.x + 16}
        y={PAPER.y + 16}
        width={PAPER.width}
        height={PAPER.height}
        style={{ fill: 'var(--fg)' }}
      />
      <rect
        x={PAPER.x}
        y={PAPER.y}
        width={PAPER.width}
        height={PAPER.height}
        strokeWidth={3}
        className="fill-surface stroke-fg"
      />
      <text x={TEXT_X} y={205} fontSize={24} fontWeight={600} className="fill-fg-subtle">
        Raport zbiorów, dokument 1 z 212
      </text>
      <text
        x={TEXT_X}
        y={268}
        fontSize={50}
        fontWeight={800}
        letterSpacing={-1.5}
        className="fill-fg"
      >
        Mróz wraca do Brazylii
      </text>
      {LINES.map((line, i) => (
        <text
          key={line}
          ref={(el) => {
            lines.current[i] = el
          }}
          x={TEXT_X}
          y={LINE_START + i * LINE_GAP}
          fontSize={40}
          fontWeight={500}
          className="fill-fg-soft"
        >
          {line}
        </text>
      ))}
      <rect x={TEXT_X} y={700} width={640} height={10} className="fill-line-soft" />
      <rect x={TEXT_X} y={730} width={600} height={10} className="fill-line-soft" />
      <rect x={TEXT_X} y={760} width={640} height={10} className="fill-line-soft" />
      <rect x={TEXT_X} y={790} width={340} height={10} className="fill-line-soft" />
      <motion.g style={{ y: scanY, opacity: scanOpacity }}>
        <rect
          x={PAPER.x}
          y={-46}
          width={PAPER.width}
          height={46}
          style={{ fill: 'var(--ink-cobalt-field)' }}
          opacity={0.7}
        />
        <rect x={PAPER.x} y={0} width={PAPER.width} height={4} style={{ fill: 'var(--fg)' }} />
      </motion.g>
    </motion.svg>
  )
}
