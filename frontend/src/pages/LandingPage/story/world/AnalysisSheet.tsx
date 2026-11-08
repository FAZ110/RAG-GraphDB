import { motion, useTransform } from 'motion/react'
import type { MotionValue } from 'motion/react'
import { into, STEP } from '../timeline'

const RISE = 170
const STARTS = ['Od encji', 'Od artykułu', 'Puste płótno']
const START_WIDTH = 200
const SHEET = { x: 60, y: 130, width: 880, height: 770 }

function Ghost({
  x,
  y,
  name,
  delay,
  progress,
}: {
  x: number
  y: number
  name: string
  delay: number
  progress: MotionValue<number>
}) {
  const opacity = useTransform(
    progress,
    [into(STEP.tools, 0.45 + delay), into(STEP.tools, 0.7 + delay)],
    [0, 1]
  )
  return (
    <motion.g style={{ opacity }}>
      <rect
        x={x - 105}
        y={y - 27}
        width={210}
        height={54}
        strokeWidth={3}
        strokeDasharray="10 8"
        fill="none"
        style={{ stroke: 'var(--fg-subtle)' }}
      />
      <text
        x={x}
        y={y + 9}
        textAnchor="middle"
        fontSize={25}
        fontWeight={600}
        className="fill-fg-subtle"
      >
        {name}
      </text>
    </motion.g>
  )
}

/** The sheet itself, under the links and chips that move onto it. */
export function AnalysisSheet({ progress }: { progress: MotionValue<number> }) {
  const times = [into(STEP.canvas, 0.12), into(STEP.canvas, 0.55)]
  const y = useTransform(progress, times, [RISE, 0])
  const opacity = useTransform(progress, times, [0, 1])
  const visibility = useTransform(progress, (p) => (p > times[0] ? 'visible' : 'hidden'))
  return (
    <motion.g style={{ y, opacity, visibility }}>
      <rect
        x={SHEET.x + 16}
        y={SHEET.y + 16}
        width={SHEET.width}
        height={SHEET.height}
        style={{ fill: 'var(--fg)' }}
      />
      <rect
        x={SHEET.x}
        y={SHEET.y}
        width={SHEET.width}
        height={SHEET.height}
        strokeWidth={3}
        className="fill-surface stroke-fg"
      />
      <rect x={SHEET.x} y={SHEET.y} width={SHEET.width} height={84} style={{ fill: 'var(--fg)' }} />
      <text
        x={SHEET.x + 32}
        y={SHEET.y + 54}
        fontSize={32}
        fontWeight={700}
        className="fill-fg-inverse"
      >
        Skąd droga kawa
      </text>
      <text
        x={SHEET.x + SHEET.width - 32}
        y={SHEET.y + 52}
        textAnchor="end"
        fontSize={24}
        fontWeight={600}
        className="fill-fg-inverse-muted"
      >
        Zapisano
      </text>
    </motion.g>
  )
}

/** The three ways an analysis begins, picked from at the top of the canvas. */
function StartChoice({ progress }: { progress: MotionValue<number> }) {
  const opacity = useTransform(
    progress,
    [
      into(STEP.canvas, 0.5),
      into(STEP.canvas, 0.75),
      into(STEP.tools, 0.05),
      into(STEP.tools, 0.25),
    ],
    [0, 1, 1, 0]
  )
  return (
    <motion.g style={{ opacity }}>
      {STARTS.map((label, i) => (
        <g
          key={label}
          transform={`translate(${SHEET.x + 32 + i * (START_WIDTH + 14)} ${SHEET.y + 104})`}
        >
          <rect
            width={START_WIDTH}
            height={46}
            strokeWidth={2}
            className={i === 0 ? 'fill-fg stroke-fg' : 'fill-surface stroke-line'}
          />
          <text
            x={START_WIDTH / 2}
            y={31}
            textAnchor="middle"
            fontSize={23}
            fontWeight={600}
            className={i === 0 ? 'fill-fg-inverse' : 'fill-fg-soft'}
          >
            {label}
          </text>
        </g>
      ))}
    </motion.g>
  )
}

export function Proposals({ progress }: { progress: MotionValue<number> }) {
  const line = useTransform(progress, [into(STEP.tools, 0.3), into(STEP.tools, 0.5)], [0, 1])
  return (
    <>
      <StartChoice progress={progress} />
      <motion.g style={{ opacity: line }}>
        <rect
          x={SHEET.x + 3}
          y={SHEET.y + 84}
          width={SHEET.width - 6}
          height={62}
          style={{ fill: 'var(--ink-ochre-field)' }}
        />
        <text
          x={SHEET.x + 32}
          y={SHEET.y + 125}
          fontSize={25}
          fontWeight={600}
          className="fill-fg-soft"
        >
          Wspólni sąsiedzi: 2 propozycje
        </text>
        <text
          x={SHEET.x + SHEET.width - 32}
          y={SHEET.y + 125}
          textAnchor="end"
          fontSize={25}
          fontWeight={700}
          className="fill-fg"
        >
          Przyjmij
        </text>
      </motion.g>
      <Ghost x={705} y={750} name="Kurs dolara" delay={0} progress={progress} />
      <Ghost x={465} y={465} name="Fracht morski" delay={0.1} progress={progress} />
    </>
  )
}
