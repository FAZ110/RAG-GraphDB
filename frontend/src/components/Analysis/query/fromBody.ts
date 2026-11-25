import type { LoadedNode } from '@/types'
import type { QueryBody } from '@/types/query'
import type { Pattern, PatternEdge, PatternNode } from './pattern'

const SOUGHT_BAND = { top: 0.1, bottom: 0.4 }
const KNOWN_BAND = { top: 0.6, bottom: 0.9 }

const across = (i: number, count: number) => (count === 1 ? 0.5 : 0.15 + (0.7 * i) / (count - 1))
// Neighbours take turns at the band's top and bottom: a slope would line three nodes up and
// hide the link between the outer two under the middle one.
const down = (i: number, count: number, band: { top: number; bottom: number }) =>
  count === 1 ? (band.top + band.bottom) / 2 : i % 2 ? band.bottom : band.top

/** A pattern as the API gives it back, drawn: sought nodes above the known ones, zigzagging so
 * none covers another or a link; known nodes with no entity are left out. */
export function fromBody(body: QueryBody, entities: readonly LoadedNode[]): Pattern {
  const byId = new Map(entities.map((e) => [e.id, e]))
  const known = body.nodes
    .map((n) => ({ n, entities: (n.ids ?? []).flatMap((id) => byId.get(id) ?? []) }))
    .filter(({ n, entities }) => n.ids && entities.length)
  const sought = body.nodes.filter((n) => !n.ids)

  const nodes: PatternNode[] = [
    ...sought.map(
      (n, i): PatternNode => ({
        key: n.key,
        known: null,
        atLeast: null,
        label: n.label ?? null,
        linkCount: n.link_count
          ? {
              min: n.link_count.min,
              type: n.link_count.type ?? null,
              label: n.link_count.label ?? null,
            }
          : null,
        nameContains: n.name_contains ?? '',
        x: across(i, sought.length),
        y: down(i, sought.length, SOUGHT_BAND),
      })
    ),
    ...known.map(
      ({ n, entities }, i): PatternNode => ({
        key: n.key,
        known: entities,
        atLeast: n.at_least && n.at_least <= entities.length ? n.at_least : null,
        label: entities[0].label,
        linkCount: null,
        nameContains: '',
        x: across(i, known.length),
        y: down(i, known.length, KNOWN_BAND),
      })
    ),
  ]
  const keys = new Set(nodes.map((n) => n.key))
  const edges = body.edges
    .filter((e) => keys.has(e.source) && keys.has(e.target))
    .map(
      (e, i): PatternEdge => ({
        key: `e${i + 1}`,
        source: e.source,
        target: e.target,
        type: e.type ?? null,
        direction: e.direction,
        maxHops: e.max_hops,
        mode: e.mode,
        via: e.via,
      })
    )
  return { nodes, edges }
}
