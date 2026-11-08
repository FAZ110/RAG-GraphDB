import type { ExpansionResponse, LoadedEdge, LoadedNode, OverviewResponse } from '@/types'

const slim = ({ id, name, label, degree }: LoadedNode) => ({ id, name, label, degree })

function withDegrees(data: OverviewResponse, touched: Iterable<string>): OverviewResponse {
  const ids = new Set(touched)
  if (!ids.size) return data
  const degree = new Map([...ids].map((id) => [id, 0]))
  for (const e of data.edges) {
    if (degree.has(e.source)) degree.set(e.source, degree.get(e.source)! + 1)
    if (degree.has(e.target)) degree.set(e.target, degree.get(e.target)! + 1)
  }
  return {
    ...data,
    nodes: data.nodes.map((n) => (degree.has(n.id) ? { ...n, degree: degree.get(n.id)! } : n)),
  }
}

export function upsertNode(data: OverviewResponse, node: LoadedNode): OverviewResponse {
  const known = data.nodes.some((n) => n.id === node.id)
  return {
    ...data,
    nodes: known
      ? data.nodes.map((n) => (n.id === node.id ? slim(node) : n))
      : [...data.nodes, slim(node)],
    total_nodes: data.total_nodes + (known ? 0 : 1),
  }
}

// Entities left out of the overview, brought in with their neighbours; degrees stay the server's.
export function mergeChunk(data: OverviewResponse, chunk: ExpansionResponse): OverviewResponse {
  const known = new Set(data.nodes.map((n) => n.id))
  const fresh = [chunk.root, ...chunk.nodes].filter((n) => !known.has(n.id) && known.add(n.id))
  const linked = new Set(data.edges.map((e) => e.id))
  return {
    ...data,
    nodes: [...data.nodes, ...fresh.map(slim)],
    edges: [...data.edges, ...chunk.edges.filter((e) => !linked.has(e.id))],
  }
}

export function removeNode(data: OverviewResponse, id: string): OverviewResponse {
  const neighbours = data.edges.flatMap((e) =>
    e.source === id ? [e.target] : e.target === id ? [e.source] : []
  )
  return withDegrees(
    {
      ...data,
      nodes: data.nodes.filter((n) => n.id !== id),
      edges: data.edges.filter((e) => e.source !== id && e.target !== id),
      total_nodes: data.total_nodes - 1,
    },
    neighbours.filter((n) => n !== id)
  )
}

export function upsertEdge(
  data: OverviewResponse,
  edge: LoadedEdge,
  replacedId?: string
): OverviewResponse {
  const gone = new Set([edge.id, replacedId])
  const old = data.edges.filter((e) => gone.has(e.id))
  return withDegrees({ ...data, edges: [...data.edges.filter((e) => !gone.has(e.id)), edge] }, [
    edge.source,
    edge.target,
    ...old.flatMap((e) => [e.source, e.target]),
  ])
}

export function removeEdge(data: OverviewResponse, id: string): OverviewResponse {
  const edge = data.edges.find((e) => e.id === id)
  if (!edge) return data
  return withDegrees({ ...data, edges: data.edges.filter((e) => e.id !== id) }, [
    edge.source,
    edge.target,
  ])
}
