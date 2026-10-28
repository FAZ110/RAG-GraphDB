import cytoscape from 'cytoscape'
import type { Core, EdgeSingular, NodeCollection, NodeSingular } from 'cytoscape'
import fcose from 'cytoscape-fcose'
import type { PlacedId } from '@/types/analysis'
import { edgeLengths } from './edgeLength'
import { unbendAround } from './routes'
import type { Point } from './routes'
import { separate, settleAt } from './settle'

cytoscape.use(fcose)

const positionOf = (n: NodeSingular): Point => ({ ...n.position() })

/**
 * Where the `move` nodes belong among `nodes`, worked out without moving anything on screen:
 * springs pull every edge to the length its label needs, from `start` or from where things
 * stand, with every other node held in place; then whatever still overlaps moves to the
 * nearest free spot.
 */
export async function planned(
  cy: Core,
  nodes: NodeCollection,
  move: NodeCollection,
  start?: ReadonlyMap<string, Point>
): Promise<Map<string, Point>> {
  const still = nodes.difference(move)
  const length = edgeLengths(nodes)
  const before = new Map(nodes.map((n) => [n.id(), positionOf(n as NodeSingular)]))
  const laid = new Map<string, Point>()

  await new Promise<void>((resolve) => {
    cy.startBatch()
    move.forEach((n) => {
      const from = start?.get(n.id())
      if (from) (n as NodeSingular).position(from)
    })
    const layout = nodes.union(nodes.edgesWith(nodes)).layout({
      name: 'fcose',
      quality: 'proof',
      randomize: false,
      animate: false,
      fit: false,
      nodeDimensionsIncludeLabels: true,
      nodeSeparation: 100,
      idealEdgeLength: (e: EdgeSingular) => length(e.source().id(), e.target().id()),
      edgeElasticity: 0.9,
      nodeRepulsion: 9000,
      gravity: 0.15,
      fixedNodeConstraint: still
        .toArray()
        .map((n) => ({ nodeId: n.id(), position: before.get(n.id())! })),
    } as cytoscape.LayoutOptions)
    // Read and put back before anything is drawn.
    layout.one('layoutstop', () => {
      move.forEach((n) => void laid.set(n.id(), positionOf(n as NodeSingular)))
      nodes.forEach((n) => void (n as NodeSingular).position(before.get(n.id())!))
      cy.endBatch()
      resolve()
    })
    layout.run()
  })
  separate(nodes, move, laid)
  return laid
}

/**
 * Lay out the canvas so nothing overlaps, labels included: the `moving` nodes find their place,
 * every other one stays exactly where it is. Without `moving`, everything settles from where it
 * stands. Ghosts and hidden types are left out. Resolves with where the moved nodes settled.
 */
export async function arrange(cy: Core, moving?: readonly string[]): Promise<PlacedId[]> {
  const nodes = cy.nodes().not('.ghost').not('.hidden')
  const move = moving ? nodes.filter((n) => moving.includes(n.id())) : nodes
  if (move.empty()) return []
  unbendAround(cy, move)
  return settleAt(move, await planned(cy, nodes, move))
}

/** Where proposed ghosts would settle among what is on the canvas, without moving anything. */
export function planGhosts(cy: Core, ids: readonly string[]): Promise<Map<string, Point>> {
  const nodes = cy.nodes().not('.hidden')
  const ghosts = nodes.filter((n) => n.hasClass('ghost') && ids.includes(n.id()))
  if (ghosts.empty()) return Promise.resolve(new Map())
  return planned(cy, nodes.not('.ghost').union(ghosts), ghosts)
}
