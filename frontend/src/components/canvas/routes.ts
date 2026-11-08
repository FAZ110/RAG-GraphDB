import type { Core, EdgeSingular, NodeCollection } from 'cytoscape'

export type Point = { x: number; y: number }

const ROUTED = ['curve-style', 'control-point-distances', 'control-point-weights'] as const

export function unbend(edge: EdgeSingular) {
  edge.removeStyle(ROUTED.join(' '))
}

/** Routes stop fitting once their ends move; those edges go back to plain arcs. */
export function unbendAround(cy: Core, nodes: NodeCollection) {
  cy.batch(() => nodes.connectedEdges().forEach(unbend))
}
