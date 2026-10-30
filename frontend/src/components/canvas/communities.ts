import type { NodeCollection } from 'cytoscape'
import Graph from 'graphology'
import louvain from 'graphology-communities-louvain'

/**
 * Which community each node belongs to: groups linked more densely among themselves than to
 * the rest, found by Louvain's modularity search. Seeded, so the same canvas splits the same way.
 */
export function communities(nodes: NodeCollection): Map<string, number> {
  return louvainCommunities(
    nodes.map((n) => n.id()),
    nodes.edgesWith(nodes).map((e) => [e.source().id(), e.target().id()])
  )
}

/** The same split for any graph, given its node ids and the pairs linked by an edge. */
export function louvainCommunities(
  ids: Iterable<string>,
  links: Iterable<readonly [string, string]>
): Map<string, number> {
  const graph = new Graph({ type: 'undirected' })
  for (const id of ids) graph.addNode(id)
  for (const [a, b] of links) if (a !== b) graph.mergeEdge(a, b)
  let seed = 1
  const rng = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646
  return new Map(Object.entries(louvain(graph, { rng })))
}
