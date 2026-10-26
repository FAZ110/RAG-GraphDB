import { useMemo } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { move, staggerDelay } from '@/design/motion'
import type { Ink } from '@/design/inks'
import { inkTint } from '@/design/inks'
import { FIELD_WIDTH, constellationFor, stretchToHeight } from './constellation'
import { seedFrom } from './contours'
import { ContourRings, Neatline } from './MapMarks'

interface Props {
  spaceId: string
  ink: Ink
}

function gridBackground(ink: Ink) {
  const line = inkTint(ink, 9)
  return {
    backgroundImage: `linear-gradient(${line} 1px, transparent 1px), linear-gradient(90deg, ${line} 1px, transparent 1px)`,
    backgroundSize: '36px 36px',
    backgroundPosition: 'center',
  }
}

// Square and cropped to the positioned box it covers, so it never waits for a measured size.
// Drawn in `currentColor`: SVG presentation attributes can't take the ink's CSS variable.
export function ConstellationField({ spaceId, ink }: Props) {
  const draw = !useReducedMotion()
  const { nodes, edges } = useMemo(
    () => stretchToHeight(constellationFor(spaceId), FIELD_WIDTH),
    [spaceId]
  )
  return (
    <svg
      viewBox={`0 0 ${FIELD_WIDTH} ${FIELD_WIDTH}`}
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 size-full"
      style={{ color: ink.color, backgroundColor: ink.field, ...gridBackground(ink) }}
      aria-hidden="true"
    >
      <g fill="none" stroke="currentColor">
        <ContourRings nodes={nodes.slice(0, 3)} seed={seedFrom(spaceId)} />
        <Neatline height={FIELD_WIDTH} />
      </g>
      {edges.map(([a, b], i) => (
        <motion.line
          key={`${a}-${b}`}
          x1={nodes[a].x}
          y1={nodes[a].y}
          x2={nodes[b].x}
          y2={nodes[b].y}
          stroke="currentColor"
          strokeOpacity={0.4}
          strokeWidth={1.25}
          initial={draw ? { pathLength: 0 } : false}
          animate={{ pathLength: 1 }}
          // Each line starts once the stars it joins are on their way.
          transition={{ ...move.panel, delay: staggerDelay(i + 2) }}
        />
      ))}
      {nodes.map((node, i) => (
        <motion.g
          key={i}
          style={{ transformOrigin: `${node.x}px ${node.y}px`, transformBox: 'view-box' }}
          initial={draw ? { scale: 0.5, opacity: 0 } : false}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ ...move.base, delay: staggerDelay(i) }}
        >
          {i === 0 && (
            <circle
              cx={node.x}
              cy={node.y}
              r={node.r + 4}
              fill="none"
              stroke="currentColor"
              strokeOpacity={0.3}
            />
          )}
          <circle cx={node.x} cy={node.y} r={node.r} fill="currentColor" />
        </motion.g>
      ))}
    </svg>
  )
}
