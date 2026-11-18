import cytoscape from 'cytoscape'
import { louvainCommunities } from '@/components/canvas/communities'

export interface Ranked {
  id: string
  /**
   * Brokers: the share of shortest links between pairs of the other entities that run through
   * it, 0 to 1; a pair nothing links counts as not running through. Critical: entities cut off.
   */
  score: number
}

export interface Cut extends Ranked {
  cut: string[]
}

export interface Group {
  /** The member with most links, which the group is named after. */
  hub: string
  ids: string[]
}

export interface Insights {
  /** On the most shortest paths between others (betweenness). */
  brokers: Ranked[]
  /** Without them part of the canvas loses its link to the rest (articulation points). */
  critical: Cut[]
  /** Sets linked more densely among themselves than to the rest (Louvain), biggest first. */
  groups: Group[]
}

const TOP = 8

const top = <T extends Ranked>(ranked: T[]) =>
  ranked
    .filter((r) => r.score > 0)
    .toSorted((a, b) => b.score - a.score || a.id.localeCompare(b.id))
    .slice(0, TOP)

/** Which entities hold the canvas together, read from its shape alone; direction is ignored. */
export function insights(
  ids: readonly string[],
  links: readonly { source: string; target: string }[]
): Insights {
  const known = new Set(ids)
  // Parallel relations and loops say nothing more about the shape, and skew the counts.
  const pairs = new Map<string, { source: string; target: string }>()
  const degree = new Map<string, number>()
  for (const { source, target } of links) {
    const key = [source, target].toSorted().join('\n')
    if (source === target || !known.has(source) || !known.has(target) || pairs.has(key)) continue
    pairs.set(key, { source, target })
    for (const id of [source, target]) degree.set(id, (degree.get(id) ?? 0) + 1)
  }
  // Cytoscape counts a pair once each way, also when told to ignore direction.
  const otherPairs = (ids.length - 1) * (ids.length - 2)
  const cy = cytoscape({
    headless: true,
    elements: [
      ...ids.map((id) => ({ data: { id } })),
      ...[...pairs.values()].map((data, i) => ({ data: { id: `e${i}`, ...data } })),
    ],
  })
  const all = cy.elements()
  const between = all.betweennessCentrality({ directed: false })
  const brokers = top(cy.nodes().map((n) => ({ id: n.id(), score: between.betweenness(n) })))
  const critical = all.hopcroftTarjanBiconnected().cut.map((node) => {
    const whole = all.components().find((c) => c.contains(node))!
    const rest = whole.not(node).not(node.connectedEdges())
    const parts = rest.components().toSorted((a, b) => b.nodes().length - a.nodes().length)
    const cut = parts.slice(1).flatMap((part) => part.nodes().map((n) => n.id()))
    return { id: node.id(), score: cut.length, cut: cut.toSorted() }
  })
  cy.destroy()

  const members = new Map<number, string[]>()
  const linked = ids.filter((id) => degree.has(id))
  for (const [id, group] of louvainCommunities(
    linked,
    [...pairs.values()].map((p) => [p.source, p.target] as const)
  )) {
    members.set(group, [...(members.get(group) ?? []), id])
  }
  const byLinks = (a: string, b: string) => degree.get(b)! - degree.get(a)! || a.localeCompare(b)
  const groups = [...members.values()]
    .map((group) => group.toSorted(byLinks))
    .toSorted((a, b) => b.length - a.length || a[0].localeCompare(b[0]))
    .map((group) => ({ hub: group[0], ids: group }))

  return {
    brokers: brokers.map((r) => ({ ...r, score: r.score / otherPairs })),
    critical: top(critical),
    // One group is the whole canvas, which tells nothing.
    groups: groups.length > 1 ? groups.slice(0, TOP) : [],
  }
}
