import { motion, useTransform } from 'motion/react'
import type { MotionValue } from 'motion/react'
import { into, STEP } from '../timeline'
import type { Point } from './data'
import { ENTITIES, NEIGHBOURS } from './data'

const DOT = 11
const LABEL_GAP = 20
const BOW = 0.14
const BEHIND_ROUTE = 0.3

/** A line bowed a little to one side, like the arcs of a contour. */
function curve([ax, ay]: Point, [bx, by]: Point) {
  const x = (ax + bx) / 2 + (by - ay) * BOW
  const y = (ay + by) / 2 - (bx - ax) * BOW
  return `M${ax},${ay}Q${x},${y} ${bx},${by}`
}

function Neighbour({
  node,
  index,
  progress,
}: {
  node: (typeof NEIGHBOURS)[number]
  index: number
  progress: MotionValue<number>
}) {
  const start = into(STEP.graph, 0.55 + index * 0.04)
  const opacity = useTransform(
    progress,
    [
      start,
      start + 0.14,
      into(STEP.path, 0.1),
      into(STEP.path, 0.5),
      into(STEP.canvas, 0.1),
      into(STEP.canvas, 0.35),
    ],
    [0, 1, 1, BEHIND_ROUTE, BEHIND_ROUTE, 0]
  )
  const visibility = useTransform(opacity, (o) => (o > 0 ? 'visible' : 'hidden'))
  const [x, y] = node.at
  const onRight = node.side === 'right'
  return (
    <motion.g style={{ opacity, visibility }}>
      {node.to.map((id) => (
        <path
          key={id}
          d={curve(node.at, ENTITIES.find((e) => e.id === id)!.graph)}
          fill="none"
          strokeWidth={2}
          strokeOpacity={0.4}
          style={{ stroke: `var(--ink-${node.ink})` }}
        />
      ))}
      <circle cx={x} cy={y} r={DOT} style={{ fill: `var(--ink-${node.ink})` }} />
      <text
        x={x + (onRight ? LABEL_GAP : -LABEL_GAP)}
        y={y + 9}
        textAnchor={onRight ? 'start' : 'end'}
        fontSize={26}
        fontWeight={500}
        strokeWidth={8}
        style={{ fill: 'var(--fg-soft)', stroke: 'var(--pastel-lilac)', paintOrder: 'stroke' }}
      >
        {node.name}
      </text>
    </motion.g>
  )
}

export function Neighbours({ progress }: { progress: MotionValue<number> }) {
  return NEIGHBOURS.map((node, i) => (
    <Neighbour key={node.name} node={node} index={i} progress={progress} />
  ))
}
