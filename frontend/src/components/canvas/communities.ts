import type { NodeCollection } from 'cytoscape'
import Graph from 'graphology'
import louvain from 'graphology-communities-louvain'

/**
 * Which community each node belongs to: groups linked more densely among themselves than to
 * the rest, found by Louvain's modularity search. Seeded, so the same canvas splits the same way.
 */
export function communities(nodes: NodeCollection): Map<string, number> {
  const graph = new Graph({ type: 'undirected' })
  nodes.forEach((n) => void graph.addNode(n.id()))
  nodes.edgesWith(nodes).forEach((e) => {
    const [a, b] = [e.source().id(), e.target().id()]
    if (a !== b) graph.mergeEdge(a, b)
  })
  let seed = 1
  const rng = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646
  return new Map(Object.entries(louvain(graph, { rng })))
}
