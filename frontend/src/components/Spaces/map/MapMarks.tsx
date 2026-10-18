import { contour } from './contours'
import type { ConstellationNode } from './constellation'

// Coordinates are on the 240×150 field (FIELD_WIDTH × FIELD_HEIGHT).

export function Graticule() {
  return (
    <g strokeOpacity={0.07} strokeWidth={0.5}>
      {[30, 60, 90, 120, 150, 180, 210].map((x) => (
        <line key={`x${x}`} x1={x} y1={6} x2={x} y2={144} />
      ))}
      {[25, 50, 75, 100, 125].map((y) => (
        <line key={`y${y}`} x1={6} y1={y} x2={234} y2={y} />
      ))}
    </g>
  )
}

export function ContourRings({ nodes, seed }: { nodes: ConstellationNode[]; seed: number }) {
  return nodes.map((node, i) =>
    [1, 2, 3].map((ring) => (
      <path
        key={`c${i}-${ring}`}
        d={contour(node.x, node.y, node.r + 5 + ring * 7, seed + i * 97 + ring * 13)}
        strokeOpacity={0.16 - ring * 0.03}
        strokeWidth={0.6}
      />
    ))
  )
}

export function Neatline() {
  return (
    <>
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
    </>
  )
}

export function NorthMark() {
  return (
    <g transform="translate(222 22)" strokeOpacity={0.55} strokeWidth={0.6}>
      <circle r={7} />
      <path d="M0,-6 L2.2,2 L0,0.6 L-2.2,2 Z" fill="currentColor" fillOpacity={0.55} />
      <text
        y={-9}
        textAnchor="middle"
        fontSize={5}
        fontWeight={700}
        fill="currentColor"
        fillOpacity={0.6}
        stroke="none"
      >
        N
      </text>
    </g>
  )
}
