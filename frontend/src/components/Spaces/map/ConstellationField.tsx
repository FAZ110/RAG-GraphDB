import { useMemo } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import type { Ink } from '@/design/inks'
import { inkTint } from '@/design/inks'
import { useElementSize } from '@/hooks/useElementSize'
import { FIELD_HEIGHT, FIELD_WIDTH, constellationFor, stretchToHeight } from './constellation'
import { seedFrom } from './contours'
import { ContourRings, Graticule, Neatline, NorthMark } from './MapMarks'

interface Props {
  spaceId: string
  ink: Ink
  sketch?: boolean
  map?: boolean
  /** Cover its positioned box edge to edge; the box's border stands in for the neatline. */
  fill?: boolean
  animated?: boolean
}

function gridBackground(ink: Ink) {
  const line = inkTint(ink, 9)
  return {
    backgroundImage: `linear-gradient(${line} 1px, transparent 1px), linear-gradient(90deg, ${line} 1px, transparent 1px)`,
    backgroundSize: '36px 36px',
    backgroundPosition: 'center',
  }
}

// Drawn in `currentColor`: SVG presentation attributes can't take the ink's CSS variable.
export function ConstellationField({
  spaceId,
  ink,
  sketch = false,
  map = false,
  fill = false,
  animated = false,
}: Props) {
  const reducedMotion = useReducedMotion()
  const draw = animated && !reducedMotion
  const [svgRef, size] = useElementSize<SVGSVGElement>()
  const aspect = size && size.width > 0 && size.height > 0 ? size.width / size.height : null
  const height = fill && aspect ? Math.max(FIELD_HEIGHT, FIELD_WIDTH / aspect) : FIELD_HEIGHT
  const { nodes, edges } = useMemo(
    () => stretchToHeight(constellationFor(spaceId), height),
    [spaceId, height]
  )
  // Waits for its size, or the drawing would start at the default proportions and jump.
  const showGraph = !fill || aspect !== null

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${FIELD_WIDTH} ${height}`}
      className={fill ? 'absolute inset-0 size-full' : 'block h-auto w-full'}
      style={{
        color: ink.color,
        backgroundColor: ink.field,
        ...(fill ? gridBackground(ink) : {}),
      }}
      aria-hidden="true"
    >
      {map && (
        <g fill="none" stroke="currentColor">
          {!fill && <Graticule />}
          {showGraph && <ContourRings nodes={nodes.slice(0, 3)} seed={seedFrom(spaceId)} />}
          {!fill && <Neatline />}
          <NorthMark />
        </g>
      )}
      {showGraph &&
        edges.map(([a, b], i) => (
          <motion.line
            key={`${a}-${b}`}
            x1={nodes[a].x}
            y1={nodes[a].y}
            x2={nodes[b].x}
            y2={nodes[b].y}
            stroke="currentColor"
            strokeOpacity={0.4}
            strokeWidth={1.25}
            strokeDasharray={sketch ? '3 4' : undefined}
            initial={draw ? { pathLength: 0 } : false}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.45, delay: 0.1 + i * 0.07, ease: 'easeInOut' }}
          />
        ))}
      {showGraph &&
        nodes.map((node, i) => (
          <motion.g
            key={i}
            style={{ transformOrigin: `${node.x}px ${node.y}px`, transformBox: 'view-box' }}
            initial={draw ? { scale: 0, opacity: 0 } : false}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 420, damping: 18, delay: 0.05 + i * 0.06 }}
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
            <circle
              cx={node.x}
              cy={node.y}
              r={node.r}
              fill={sketch ? undefined : 'currentColor'}
              stroke={sketch ? 'currentColor' : undefined}
              strokeWidth={sketch ? 1.25 : undefined}
              style={sketch ? { fill: ink.field } : undefined}
            />
          </motion.g>
        ))}
    </svg>
  )
}
