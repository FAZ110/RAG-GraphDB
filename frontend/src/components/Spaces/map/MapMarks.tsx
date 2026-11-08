import { contour } from './contours'
import { FIELD_WIDTH } from './constellation'
import type { ConstellationNode } from './constellation'

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

export function Neatline({ height }: { height: number }) {
  return (
    <>
      <rect
        x={2}
        y={2}
        width={FIELD_WIDTH - 4}
        height={height - 4}
        strokeOpacity={0.5}
        strokeWidth={0.5}
      />
      <rect
        x={3}
        y={3}
        width={FIELD_WIDTH - 6}
        height={height - 6}
        strokeOpacity={0.45}
        strokeWidth={2}
        strokeDasharray="8 8"
      />
      <rect
        x={4}
        y={4}
        width={FIELD_WIDTH - 8}
        height={height - 8}
        strokeOpacity={0.5}
        strokeWidth={0.5}
      />
    </>
  )
}
