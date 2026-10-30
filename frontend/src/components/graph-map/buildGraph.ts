import { DEFAULT_EDGE_CURVATURE, indexParallelEdgesIndex } from '@sigma/edge-curve'
import Graph from 'graphology'
import { random } from 'graphology-layout'
import { louvainCommunities } from '@/components/canvas/communities'
import { inkColors } from '@/components/canvas/inkColors'
import type { OverviewResponse } from '@/types'
import { nodeRadius } from './style'
import type { MapEdgeAttributes, MapNodeAttributes } from './types'

export type MapGraph = Graph<MapNodeAttributes, MapEdgeAttributes>

const JITTER = 0.02
const CURVE_AMPLITUDE = 3.5
export const CURVED = 'curved'

function seeded() {
  let seed = 1
  return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646
}

export function buildGraph(data: OverviewResponse, edgeColor: string): MapGraph {
  const graph: MapGraph = new Graph({ type: 'directed', multi: true, allowSelfLoops: true })
  syncGraph(graph, data, edgeColor, false)
  random.assign(graph, { rng: seeded(), scale: Math.sqrt(graph.order) * 10 })
  return graph
}

/** Brings the graph in line with the data, keeping every position it already has. */
export function syncGraph(
  graph: MapGraph,
  data: OverviewResponse,
  edgeColor: string,
  place = true
) {
  const community = louvainCommunities(
    data.nodes.map((n) => n.id),
    data.edges.map((e) => [e.source, e.target] as const)
  )
  const nodeIds = new Set(data.nodes.map((n) => n.id))
  const edgeIds = new Set(data.edges.map((e) => e.id))
  graph.filterNodes((id) => !nodeIds.has(id)).forEach((id) => graph.dropNode(id))
  graph.filterEdges((id) => !edgeIds.has(id)).forEach((id) => graph.dropEdge(id))

  const added: string[] = []
  for (const node of data.nodes) {
    const attributes = {
      label: node.name || node.id,
      kind: node.label,
      degree: node.degree,
      community: community.get(node.id) ?? 0,
      size: nodeRadius(node.degree),
      color: inkColors(node.label).color,
    }
    if (graph.hasNode(node.id)) graph.mergeNodeAttributes(node.id, attributes)
    else {
      graph.addNode(node.id, { ...attributes, x: 0, y: 0 })
      added.push(node.id)
    }
  }
  for (const edge of data.edges) {
    if (graph.hasEdge(edge.id) || !graph.hasNode(edge.source) || !graph.hasNode(edge.target))
      continue
    graph.addDirectedEdgeWithKey(edge.id, edge.source, edge.target, {
      relation: edge.type,
      size: 1,
      color: edgeColor,
    })
  }
  curveParallel(graph)
  if (place && added.length) placeNew(graph, new Set(added))
}

function curveParallel(graph: MapGraph) {
  indexParallelEdgesIndex(graph)
  graph.forEachEdge((edge, { parallelIndex: index, parallelMaxIndex: max }) => {
    if (typeof index !== 'number' || !max) {
      graph.removeEdgeAttribute(edge, 'type')
      graph.removeEdgeAttribute(edge, 'curvature')
      return
    }
    const widest = CURVE_AMPLITUDE * (1 - Math.exp(-max / CURVE_AMPLITUDE)) * DEFAULT_EDGE_CURVATURE
    graph.mergeEdgeAttributes(edge, { type: CURVED, curvature: (widest * index) / max })
  })
}

function placeNew(graph: MapGraph, added: ReadonlySet<string>) {
  const placed = graph.filterNodes((id) => !added.has(id))
  const xs = placed.map((id) => graph.getNodeAttribute(id, 'x'))
  const ys = placed.map((id) => graph.getNodeAttribute(id, 'y'))
  const span = xs.length ? Math.max(Math.max(...xs) - Math.min(...xs), 1) : 1
  const mean = (values: number[]) => values.reduce((a, b) => a + b, 0) / Math.max(values.length, 1)
  const centre = { x: mean(xs), y: mean(ys) }
  const rng = seeded()

  for (const id of added) {
    const near = graph.neighbors(id).filter((n) => !added.has(n))
    const at = near.length
      ? {
          x: mean(near.map((n) => graph.getNodeAttribute(n, 'x'))),
          y: mean(near.map((n) => graph.getNodeAttribute(n, 'y'))),
        }
      : centre
    graph.mergeNodeAttributes(id, {
      x: at.x + (rng() - 0.5) * span * JITTER,
      y: at.y + (rng() - 0.5) * span * JITTER,
    })
  }
}
