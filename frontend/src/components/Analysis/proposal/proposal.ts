import type { LoadedEdge, LoadedNode } from '@/types'
import type { Point } from '@/types/analysis'

export type ProposalKind = 'expand' | 'common' | 'path' | 'type' | 'article'

/** Candidates one relation brings, one way, of one type: "a player plays in" Inter. */
export interface ProposalGroup {
  key: string
  type: string
  label: string
  incoming: boolean
  count: number
}

/** A narrower group: one relation, one way, to one type, as the inspector lists them. */
export const relationGroupKey = (incoming: boolean, type: string, label: string) =>
  `${incoming ? 'in' : 'out'}:${type}:${label}`

/** What a tool found, shown as ghosts until accepted or dismissed. */
export interface Proposal {
  kind: ProposalKind
  title: string
  /** Candidates not on the canvas yet, the most relevant first. */
  nodes: LoadedNode[]
  edges: LoadedEdge[]
  spots: ReadonlyMap<string, Point>
  /** Nodes and edges of the routes found, drawn in ink. */
  route?: ReadonlySet<string>
  /** Narrower sets of the candidates, e.g. the neighbours one relation brings. */
  groups?: ProposalGroup[]
  /** Entities a candidate links to, per candidate; groups filter on these. */
  memberOf?: ReadonlyMap<string, ReadonlySet<string>>
  /** Entity to cite once accepted, e.g. the article the candidates come from. */
  articleId?: string
  /** Shown when nothing was found. */
  empty: string
}

export interface ProposalView {
  proposal: Proposal
  group: string | null
  /** How many of the candidates show as ghosts; the rest wait behind "show more". */
  shown: number
}

export const PAGE = 12

export function candidates(view: ProposalView): LoadedNode[] {
  const { proposal, group } = view
  if (!group) return proposal.nodes
  return proposal.nodes.filter((n) => proposal.memberOf?.get(n.id)?.has(group))
}

export function visible(view: ProposalView): LoadedNode[] {
  return candidates(view).slice(0, view.shown)
}
