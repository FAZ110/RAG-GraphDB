import { useMemo } from 'react'
import { FIELD_HEIGHT, FIELD_WIDTH, constellationFor } from './spaceVisuals'
import type { Ink } from './spaceVisuals'

interface Props {
  spaceId: string
  ink: Ink
  /** Pencil sketch of a map that is not inked yet: dashed links, hollow nodes. */
  sketch?: boolean
  /** Print it as a map sheet: neatline, graticule, contours and a north mark. */
  map?: boolean
  /** Only the sheet's frame and grid: no constellation and no contours. */
  bare?: boolean
}

// A cheap repeatable number from the id, so the contours of a space never change.
function seedFrom(text: string): number {
  let seed = 7
  for (const char of text) seed = (seed * 31 + char.charCodeAt(0)) >>> 0
  return seed
}

// A closed, gently irregular ring around a point, like a contour line round a hill.
function contour(cx: number, cy: number, radius: number, seed: number): string {
  const a = (seed % 628) / 100
  const b = ((seed >> 8) % 628) / 100
  const points: string[] = []
  for (let step = 0; step < 40; step++) {
    const angle = (step / 40) * Math.PI * 2
    const wobble = 1 + 0.14 * Math.sin(3 * angle + a) + 0.07 * Math.sin(5 * angle + b)
    const r = radius * wobble
    points.push(
      `${(cx + Math.cos(angle) * r).toFixed(1)},${(cy + Math.sin(angle) * r * 0.8).toFixed(1)}`
    )
  }
  return `M${points.join('L')}Z`
}

export function ConstellationField({
  spaceId,
  ink,
  sketch = false,
  map = false,
  bare = false,
}: Props) {
  const { nodes, edges } = useMemo(() => constellationFor(spaceId), [spaceId])
  const seed = seedFrom(spaceId)

  return (
    <svg
      viewBox={`0 0 ${FIELD_WIDTH} ${FIELD_HEIGHT}`}
      className="block h-auto w-full"
      style={{ backgroundColor: ink.field }}
      aria-hidden="true"
    >
      {map && (
        <g fill="none" stroke={ink.color}>
          {/* Graticule */}
          {[30, 60, 90, 120, 150, 180, 210].map((x) => (
            <line
              key={`x${x}`}
              x1={x}
              y1={6}
              x2={x}
              y2={144}
              strokeOpacity={0.07}
              strokeWidth={0.5}
            />
          ))}
          {[25, 50, 75, 100, 125].map((y) => (
            <line
              key={`y${y}`}
              x1={6}
              y1={y}
              x2={234}
              y2={y}
              strokeOpacity={0.07}
              strokeWidth={0.5}
            />
          ))}
          {/* Contour lines round the three most important places */}
          {!bare &&
            nodes
              .slice(0, 3)
              .map((node, i) =>
                [1, 2, 3].map((ring) => (
                  <path
                    key={`c${i}-${ring}`}
                    d={contour(node.x, node.y, node.r + 5 + ring * 7, seed + i * 97 + ring * 13)}
                    strokeOpacity={0.16 - ring * 0.03}
                    strokeWidth={0.6}
                  />
                ))
              )}
          {/* Neatline with an alternating scale border, as on survey maps */}
          <rect x={2} y={2} width={236} height={146} strokeOpacity={0.5} strokeWidth={0.5} />
          <rect
            x={3}
            y={3}
            width={234}
            height={144}
            strokeOpacity={0.45}
            strokeWidth={2}
            strokeDasharray="8 8"
          />
          <rect x={4} y={4} width={232} height={142} strokeOpacity={0.5} strokeWidth={0.5} />
          {/* North mark, left off a bare sheet so a list printed on it runs clear */}
          {!bare && (
            <g transform="translate(222 22)" strokeOpacity={0.55} strokeWidth={0.6}>
              <circle r={7} />
              <path d="M0,-6 L2.2,2 L0,0.6 L-2.2,2 Z" fill={ink.color} fillOpacity={0.55} />
              <text
                y={-9}
                textAnchor="middle"
                fontSize={5}
                fontWeight={700}
                fill={ink.color}
                fillOpacity={0.6}
                stroke="none"
              >
                N
              </text>
            </g>
          )}
        </g>
      )}
      {!bare &&
        edges.map(([a, b]) => (
          <line
            key={`${a}-${b}`}
            x1={nodes[a].x}
            y1={nodes[a].y}
            x2={nodes[b].x}
            y2={nodes[b].y}
            stroke={ink.color}
            strokeOpacity={0.4}
            strokeWidth={1.25}
            strokeDasharray={sketch ? '3 4' : undefined}
          />
        ))}
      {!bare &&
        nodes.map((node, i) => (
          <g key={i}>
            {i === 0 && (
              <circle
                cx={node.x}
                cy={node.y}
                r={node.r + 4}
                fill="none"
                stroke={ink.color}
                strokeOpacity={0.3}
              />
            )}
            <circle
              cx={node.x}
              cy={node.y}
              r={node.r}
              fill={sketch ? ink.field : ink.color}
              stroke={sketch ? ink.color : undefined}
              strokeWidth={sketch ? 1.25 : undefined}
            />
          </g>
        ))}
    </svg>
  )
}
