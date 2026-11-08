import { alongLine, blockBeside, centroid, spreadAround } from '@/components/canvas/placement'
import { pluralForm, typeName } from '@/components/Spaces/spaceText'
import type { ExpansionResponse, LoadedEdge, LoadedNode } from '@/types'
import type { CommonResult, PathResult, Point, Subgraph } from '@/types/analysis'
import type { Placed } from '../state/canvasDoc'
import { relationGroupKey } from './proposal'
import type { Proposal, ProposalGroup } from './proposal'

export interface Context {
  onCanvas: ReadonlyMap<string, Placed>
  /** Where the view's middle is, for proposals with nothing on the canvas to gather round. */
  viewCenter: Point
}

const fresh = (nodes: readonly LoadedNode[], ctx: Context) =>
  nodes.filter((n) => !ctx.onCanvas.has(n.id))

const taken = (ctx: Context) => [...ctx.onCanvas.values()]

const spotsFor = (nodes: readonly LoadedNode[], points: readonly Point[]) =>
  new Map(nodes.map((n, i) => [n.id, points[i]]))

export function expandProposal(root: Placed, res: ExpansionResponse, ctx: Context): Proposal {
  const nodes = fresh(res.nodes, ctx)
  const groups = new Map<string, ProposalGroup>()
  const memberOf = new Map<string, Set<string>>()
  for (const edge of res.edges) {
    const incoming = edge.target === root.node.id
    const other = incoming ? edge.source : edge.target
    const node = res.nodes.find((n) => n.id === other)
    if (!node || ctx.onCanvas.has(other)) continue
    const key = relationGroupKey(incoming, edge.type, node.label)
    const members = memberOf.get(other) ?? new Set()
    const group = groups.get(key) ?? { key, type: edge.type, label: node.label, incoming, count: 0 }
    if (!members.has(key)) group.count += 1
    members.add(key)
    groups.set(key, group)
    memberOf.set(other, members)
  }
  return {
    kind: 'expand',
    title: root.node.name,
    nodes,
    edges: res.edges,
    spots: spotsFor(nodes, spreadAround(root, nodes.length, taken(ctx))),
    groups: [...groups.values()].toSorted((a, b) => b.count - a.count),
    memberOf,
    empty: 'Wszystkie powiązania są już w analizie',
  }
}

export function commonProposal(selected: Placed[], res: CommonResult, ctx: Context): Proposal {
  const nodes = fresh(res.nodes, ctx)
  const around = centroid(selected)
  // What they share is inked with its links, whether it is on the canvas already or proposed.
  const route = new Set([
    ...selected.map((s) => s.node.id),
    ...res.nodes.map((n) => n.id),
    ...res.edges.map((e) => e.id),
  ])
  return {
    kind: 'common',
    title: selected.map((s) => s.node.name).join(' + '),
    nodes,
    edges: res.edges,
    route,
    spots: spotsFor(nodes, spreadAround(around, nodes.length, taken(ctx))),
    empty: res.total ? 'Wszystko, co je łączy, jest już w analizie' : 'Nie mają wspólnych powiązań',
  }
}

const ROUTE_SPREAD = 90
const STEP_FORMS = { one: 'krok', few: 'kroki', many: 'kroków' }

export function pathProposal(from: Placed, to: Placed, res: PathResult, ctx: Context): Proposal {
  const byId = new Map(res.nodes.map((n) => [n.id, n]))
  const spots = new Map<string, Point>()
  const route = new Set<string>()
  const edges: LoadedEdge[] = []
  res.paths.forEach((path, i) => {
    const bow = (i - (res.paths.length - 1) / 2) * ROUTE_SPREAD
    const between = path.node_ids.slice(1, -1)
    const points = alongLine(from, to, between.length, bow)
    between.forEach((id, j) => {
      if (!ctx.onCanvas.has(id) && !spots.has(id)) spots.set(id, points[j])
    })
    path.node_ids.forEach((id) => route.add(id))
    path.edges.forEach((e) => {
      route.add(e.id)
      edges.push(e)
    })
  })
  const nodes = [...spots.keys()].map((id) => byId.get(id)!).filter(Boolean)
  const steps = res.paths[0] ? res.paths[0].node_ids.length - 1 : 0
  return {
    kind: 'path',
    title: `${from.node.name} → ${to.node.name}${steps ? `, ${steps} ${pluralForm(steps, STEP_FORMS)}` : ''}`,
    nodes,
    edges,
    spots,
    route,
    empty: res.paths.length ? 'Cała ścieżka jest już w analizie' : 'Brak ścieżki do 6 kroków',
  }
}

export function typeProposal(label: string, nodes: LoadedNode[], ctx: Context): Proposal {
  const candidates = fresh(nodes, ctx)
  const at = ctx.onCanvas.size ? blockBeside(taken(ctx), candidates.length) : null
  return {
    kind: 'type',
    title: typeName(label),
    nodes: candidates,
    edges: [],
    spots: spotsFor(candidates, at ?? spreadAround(ctx.viewCenter, candidates.length, [])),
    empty: 'Wszystkie encje tego typu są już w analizie',
  }
}

export function articleProposal(
  articleId: string,
  title: string,
  graph: Subgraph,
  ctx: Context
): Proposal {
  const nodes = fresh(graph.nodes, ctx).toSorted((a, b) => b.degree - a.degree)
  return {
    kind: 'article',
    title,
    nodes,
    edges: graph.edges,
    spots: spotsFor(nodes, spreadAround(ctx.viewCenter, nodes.length, taken(ctx))),
    articleId,
    empty: 'Wszystkie encje z artykułu są już w analizie',
  }
}
