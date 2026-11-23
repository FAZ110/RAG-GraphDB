import type { Core, EdgeSingular, NodeCollection } from 'cytoscape'

export type Point = { x: number; y: number }

const ROUTED = ['curve-style', 'control-point-distances', 'control-point-weights'] as const

/** The bow an edge is drawn with, for the router to glide from; see `draw` in router.ts. */
export const BOW = '_bow'

export function unbend(edge: EdgeSingular) {
  edge.removeStyle(ROUTED.join(' '))
  // A lone edge is now straight; a fan goes back to Cytoscape's own spread, which no bow describes.
  if (edge.parallelEdges().length > 1) edge.removeScratch(BOW)
  else edge.scratch(BOW, 0)
}

/** Routes stop fitting once their ends move; those edges go back to plain arcs. */
export function unbendAround(cy: Core, nodes: NodeCollection) {
  cy.batch(() => nodes.connectedEdges().forEach(unbend))
}
