import type { Core, NodeSingular } from 'cytoscape'
import type { PlacedId } from '@/types/analysis'
import { planned } from './arrange'
import { edgeLengths } from './edgeLength'
import { dotSource, graphviz } from './graphviz'
import type { GraphvizJson } from './graphviz'
import { unbendAround } from './routes'
import type { Point } from './routes'
import { NODE_GAP, settleAt } from './settle'

const SETTINGS = [
  // Stress majorization keeps distances true to the graph, which untangles it far better than
  // springs. VPSC then removes overlaps under separation constraints, moving each node as
  // little as it can; loose parts are packed in close by.
  `graph [mode=major, model=shortpath, overlap=vpsc, sep="+${NODE_GAP / 2}", splines=false, pack=8, start=1]`,
]

const centroid = (points: Point[]) => ({
  x: points.reduce((s, p) => s + p.x, 0) / points.length,
  y: points.reduce((s, p) => s + p.y, 0) / points.length,
})

/**
 * Lay the whole canvas out afresh: stress gives the shape with as few crossings as it can, then
 * springs stretch each edge to the length its label needs, which stress only roughly keeps
 * where groups are dense. Measured on a real space: two crossings, no overlaps, no edge too
 * short for its label. Ghosts and hidden types are left out. Resolves with where nodes ended up.
 */
export async function tidy(cy: Core): Promise<PlacedId[]> {
  const nodes = cy.nodes().not('.ghost').not('.hidden')
  if (nodes.empty()) return []

  const source = dotSource(nodes, SETTINGS, edgeLengths(nodes))
  const json = JSON.parse((await graphviz()).layout(source, 'json', 'neato')) as GraphvizJson
  const stress = new Map<string, Point>()
  for (const o of json.objects ?? []) {
    const [x, y] = (o.pos ?? '').split(',').map(Number)
    if (Number.isFinite(x) && Number.isFinite(y)) stress.set(o.name, { x, y: -y })
  }
  // Laid out from scratch it lands anywhere; it goes back where the canvas was.
  const shift = centroid(nodes.map((n) => (n as NodeSingular).position()))
  const at = centroid([...stress.values()])
  stress.forEach((p) => {
    p.x += shift.x - at.x
    p.y += shift.y - at.y
  })

  const laid = await planned(cy, nodes, nodes, stress)
  // Old routes won't fit the new places; the router draws new ones once it settles.
  unbendAround(cy, nodes)
  return settleAt(nodes, laid)
}
