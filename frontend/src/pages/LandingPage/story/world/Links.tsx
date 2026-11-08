import { motion, useTransform } from 'motion/react'
import type { MotionValue } from 'motion/react'
import type { Relation } from './data'

export interface Place {
  x: MotionValue<number>
  y: MotionValue<number>
}

interface LinkProps {
  relation: Relation
  places: Record<string, Place>
  progress: MotionValue<number>
  drawFrom: number
  drawTo: number
  color: string
  halo: string
  width: number
}

function Link({ relation, places, progress, drawFrom, drawTo, color, halo, width }: LinkProps) {
  const from = places[relation.from]
  const to = places[relation.to]
  const draw = useTransform(progress, [drawFrom, drawTo], [0, 1])
  const x2 = useTransform([from.x, to.x, draw], ([a, b, d]: number[]) => a + (b - a) * d)
  const y2 = useTransform([from.y, to.y, draw], ([a, b, d]: number[]) => a + (b - a) * d)
  const midX = useTransform([from.x, to.x], ([a, b]: number[]) => (a + b) / 2)
  const midY = useTransform([from.y, to.y], ([a, b]: number[]) => (a + b) / 2 + 8)
  const labelOpacity = useTransform(progress, [drawTo - 0.1, drawTo], [0, 1])
  return (
    <>
      <motion.line
        x1={from.x}
        y1={from.y}
        x2={x2}
        y2={y2}
        strokeWidth={width}
        style={{ stroke: color }}
      />
      {relation.label && (
        <motion.text
          x={midX}
          y={midY}
          textAnchor="middle"
          fontSize={22}
          fontWeight={500}
          strokeWidth={9}
          style={{ fill: color, stroke: halo, paintOrder: 'stroke', opacity: labelOpacity }}
        >
          {relation.label}
        </motion.text>
      )}
    </>
  )
}

interface Props {
  relations: Relation[]
  places: Record<string, Place>
  progress: MotionValue<number>
  /** When the first link starts and the last one ends. */
  from: number
  to: number
  color: string
  halo: string
  width?: number
}

/** Links drawn one after another across the given stretch. */
export function Links({ relations, places, progress, from, to, color, halo, width = 3 }: Props) {
  const share = (to - from) / relations.length
  return relations.map((relation, i) => (
    <Link
      key={`${relation.from}-${relation.to}`}
      relation={relation}
      places={places}
      progress={progress}
      drawFrom={from + i * share}
      drawTo={from + (i + 1) * share}
      color={color}
      halo={halo}
      width={width}
    />
  ))
}
