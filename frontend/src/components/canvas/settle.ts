import cytoscape from 'cytoscape'
import type { NodeCollection, NodeSingular } from 'cytoscape'
import type { PlacedId } from '@/types/analysis'
import { canvasMotion } from './motion'
import type { Point } from './routes'

// How far apart node boxes, labels included, must stay, and how finely free spots are sought.
export const NODE_GAP = 24
const SEARCH_STEP = 12
const SEARCH_LIMIT = 3000

type Box = { x1: number; x2: number; y1: number; y2: number }

const clashes = (a: Box, b: Box) =>
  a.x1 < b.x2 + NODE_GAP &&
  b.x1 < a.x2 + NODE_GAP &&
  a.y1 < b.y2 + NODE_GAP &&
  b.y1 < a.y2 + NODE_GAP

/**
 * Move each of the `moving` nodes to the free spot nearest where it was laid out, searching
 * outwards ring by ring, so no two boxes, labels included, come closer than the gap. Every other
 * node stays exactly where it is.
 */
export function separate(nodes: NodeCollection, moving: NodeCollection, at: Map<string, Point>) {
  const shape = (n: NodeSingular, p: Point): Box => {
    const b = n.boundingBox({ includeLabels: true })
    const o = n.position()
    return {
      x1: b.x1 - o.x + p.x,
      x2: b.x2 - o.x + p.x,
      y1: b.y1 - o.y + p.y,
      y2: b.y2 - o.y + p.y,
    }
  }
  const placed = nodes.difference(moving).map((n) => {
    const node = n as NodeSingular
    return shape(node, node.position())
  })
  moving.forEach((n) => {
    const want = at.get(n.id()) ?? n.position()
    for (let r = 0; r <= SEARCH_LIMIT; r += SEARCH_STEP) {
      const slots = Math.max(1, Math.ceil((2 * Math.PI * r) / SEARCH_STEP))
      for (let i = 0; i < slots; i++) {
        const angle = (2 * Math.PI * i) / slots
        const spot = { x: want.x + r * Math.cos(angle), y: want.y + r * Math.sin(angle) }
        const box = shape(n, spot)
        if (placed.some((b) => clashes(box, b))) continue
        at.set(n.id(), spot)
        placed.push(box)
        return
      }
    }
  })
}

/** Glide the `moving` nodes to where they were laid out; resolves with where they ended up. */
export async function settleAt(moving: NodeCollection, at: Map<string, Point>) {
  const { duration, easing } = canvasMotion('panel')
  await new Promise<void>((resolve) => {
    const layout = moving.layout({
      name: 'preset',
      positions: (n: NodeSingular) => at.get(n.id()) ?? n.position(),
      animate: duration > 0,
      animationDuration: duration,
      animationEasing: easing,
      fit: false,
    } as cytoscape.LayoutOptions)
    layout.one('layoutstop', () => resolve())
    layout.run()
  })
  return moving.map((n): PlacedId => ({ id: n.id(), ...n.position() }))
}
