import { motion } from 'motion/react'
import type { ComponentProps } from 'react'

const HEIGHT = 26
const SHADOW = 3

interface Props extends ComponentProps<typeof motion.g> {
  width: number
  label: string
  ink: string
  dashed?: boolean
}

/** The same marked name that entities wear on the page's graph. */
export function Tag({ width, label, ink, dashed, ...group }: Props) {
  return (
    <motion.g {...group}>
      {!dashed && (
        <rect x={SHADOW} y={SHADOW} width={width} height={HEIGHT} fill={`var(--ink-${ink})`} />
      )}
      <rect
        width={width}
        height={HEIGHT}
        fill={`var(--ink-${ink}-field)`}
        stroke={`var(--ink-${ink})`}
        strokeWidth={1.5}
        strokeDasharray={dashed ? '4 3' : undefined}
      />
      <text
        x={width / 2}
        y={17.5}
        textAnchor="middle"
        fontSize={12}
        fontWeight={600}
        fill={`var(--ink-${ink})`}
      >
        {label}
      </text>
    </motion.g>
  )
}
