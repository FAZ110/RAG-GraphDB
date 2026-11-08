import cytoscape from 'cytoscape'
import type { Core, NodeSingular } from 'cytoscape'
import type { PlacedId } from '@/types/analysis'
import { canvasMotion } from './motion'
import { unbendAround } from './routes'

/**
 * The first, plain tidy: springs settle every node from where it stands, with one edge length
 * for all and nothing else considered. Kept to compare against the refined one.
 */
export function basicTidy(cy: Core): Promise<PlacedId[]> {
  const nodes = cy.nodes().not('.ghost').not('.hidden')
  if (nodes.empty()) return Promise.resolve([])
  unbendAround(cy, nodes)
  const { duration, easing } = canvasMotion('panel')

  return new Promise((resolve) => {
    const layout = nodes.union(nodes.edgesWith(nodes)).layout({
      name: 'fcose',
      quality: 'proof',
      randomize: false,
      animate: duration > 0,
      animationDuration: duration,
      animationEasing: easing,
      fit: false,
      nodeDimensionsIncludeLabels: true,
      nodeSeparation: 80,
      idealEdgeLength: 120,
      nodeRepulsion: 8000,
      gravity: 0.2,
    } as cytoscape.LayoutOptions)
    layout.one('layoutstop', () =>
      resolve(nodes.map((n) => ({ id: n.id(), ...(n as NodeSingular).position() })))
    )
    layout.run()
  })
}
