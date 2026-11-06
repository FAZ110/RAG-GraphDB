import type { LoadedEdge, LoadedNode } from '@/types'
import type { Point } from '@/types/analysis'

const FRAGMENT_SPACING = 110

/** Entities cut out of the space's map, where they sat there. */
export type Fragment = { id: string; x: number; y: number }[]

/** The map's shape of a fragment, rescaled to canvas spacing; the map's y grows upwards. */
export function fragmentSpots(fragment: Fragment): Map<string, Point> {
  const xs = fragment.map((p) => p.x)
  const ys = fragment.map((p) => p.y)
  const [minX, maxX, minY, maxY] = [
    Math.min(...xs),
    Math.max(...xs),
    Math.min(...ys),
    Math.max(...ys),
  ]
  const side = Math.max(maxX - minX, maxY - minY) || 1
  const scale = (Math.sqrt(fragment.length) * FRAGMENT_SPACING) / side
  const [cx, cy] = [(minX + maxX) / 2, (minY + maxY) / 2]
  return new Map(fragment.map((p) => [p.id, { x: (p.x - cx) * scale, y: (cy - p.y) * scale }]))
}

/** The entity most linked within the fragment, ties going to the bigger hub of the whole graph. */
export function fragmentHub(
  nodes: readonly LoadedNode[],
  edges: readonly LoadedEdge[]
): LoadedNode {
  const links = new Map<string, number>()
  for (const e of edges)
    for (const id of [e.source, e.target]) links.set(id, (links.get(id) ?? 0) + 1)
  return nodes.reduce((best, n) => {
    const [a, b] = [links.get(n.id) ?? 0, links.get(best.id) ?? 0]
    return a > b || (a === b && n.degree > best.degree) ? n : best
  })
}
