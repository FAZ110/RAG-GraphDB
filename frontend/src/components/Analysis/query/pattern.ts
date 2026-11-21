import type { LoadedNode } from '@/types'
import type { Direction, LinkMode, LinkVia, QueryBody } from '@/types/query'
import type { LinkCount } from './counting'

/** A node of the question: entities the user picked, or one being sought. */
export interface PatternNode {
  key: string
  /** The entities it stands for when known; any of them matches, or `atLeast` of them. */
  known: LoadedNode[] | null
  atLeast: number | null
  label: string | null
  /** Sought only: how many entities it must be linked to. */
  linkCount: LinkCount | null
  nameContains: string
  /** Where it is drawn, as fractions of the stage, so it keeps its place when that resizes. */
  x: number
  y: number
}

export interface PatternEdge {
  key: string
  source: string
  target: string
  type: string | null
  /** Seen from `source`. */
  direction: Direction
  maxHops: number
  mode: LinkMode
  via: LinkVia
}

export interface Pattern {
  nodes: PatternNode[]
  edges: PatternEdge[]
}

export const MAX_NODES = 6
export const MAX_HOPS = 3

// Places a new node may take, the middle of the stage first.
const SPOTS = [0.5, 0.3, 0.7, 0.15, 0.85].flatMap((y) =>
  [0.5, 0.28, 0.72, 0.12, 0.88].map((x) => ({ x, y }))
)
// How far apart, in fractions of the stage, two nodes must sit not to touch.
const CLEAR = { x: 0.2, y: 0.13 }

const nextKey = (taken: readonly { key: string }[], prefix: string) => {
  let i = 1
  while (taken.some((t) => t.key === `${prefix}${i}`)) i += 1
  return `${prefix}${i}`
}

// How close, in fractions of the stage, a new node may come to a drawn link.
const LINK_CLEAR = 0.1

function distanceToLink(s: { x: number; y: number }, a: PatternNode, b: PatternNode): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const along = dx || dy ? ((s.x - a.x) * dx + (s.y - a.y) * dy) / (dx * dx + dy * dy) : 0
  const t = Math.min(1, Math.max(0, along))
  return Math.hypot(s.x - (a.x + t * dx), s.y - (a.y + t * dy))
}

/** A place clear of other nodes and of the links between them, so nothing looks linked. */
function freeSpot(p: Pattern): { x: number; y: number } {
  const byKey = new Map(p.nodes.map((n) => [n.key, n]))
  const clear = (s: { x: number; y: number }) =>
    p.nodes.every((n) => Math.abs(n.x - s.x) > CLEAR.x || Math.abs(n.y - s.y) > CLEAR.y) &&
    p.edges.every((e) => distanceToLink(s, byKey.get(e.source)!, byKey.get(e.target)!) > LINK_CLEAR)
  return SPOTS.find(clear) ?? { x: 0.5, y: 0.5 }
}

const knownNode = (key: string, entity: LoadedNode, at: { x: number; y: number }): PatternNode => ({
  key,
  known: [entity],
  atLeast: null,
  label: entity.label,
  linkCount: null,
  nameContains: '',
  ...at,
})

const soughtNode = (key: string, at: { x: number; y: number }): PatternNode => ({
  key,
  known: null,
  atLeast: null,
  label: null,
  linkCount: null,
  nameContains: '',
  ...at,
})

/** The picked entities along the bottom and one sought node above them, not yet linked. */
export function startPattern(selected: readonly LoadedNode[]): Pattern {
  const picked = selected.slice(0, MAX_NODES - 1)
  const nodes = picked.map((e, i) =>
    knownNode(`k${i + 1}`, e, { x: (i + 1) / (picked.length + 1), y: 0.72 })
  )
  return {
    nodes: [...nodes, soughtNode('x1', { x: 0.5, y: picked.length ? 0.3 : 0.5 })],
    edges: [],
  }
}

/** A new sought node in a free place; returns the pattern and the node's key. */
export function addSought(p: Pattern): [Pattern, string] {
  const key = nextKey(p.nodes, 'x')
  return [{ ...p, nodes: [...p.nodes, soughtNode(key, freeSpot(p))] }, key]
}

/** An entity as a known node in a free place, unless it is in the question already. */
export function addKnown(p: Pattern, entity: LoadedNode): [Pattern, string | null] {
  const inside = p.nodes.some((n) => n.known?.some((e) => e.id === entity.id))
  if (inside || p.nodes.length >= MAX_NODES) return [p, null]
  const key = nextKey(p.nodes, 'k')
  return [{ ...p, nodes: [...p.nodes, knownNode(key, entity, freeSpot(p))] }, key]
}

/** Link two nodes, unless they are one node or linked already. */
export function connect(p: Pattern, a: string, b: string): Pattern {
  const linked = p.edges.some(
    (e) => (e.source === a && e.target === b) || (e.source === b && e.target === a)
  )
  if (a === b || linked) return p
  const edge: PatternEdge = {
    key: nextKey(p.edges, 'e'),
    source: a,
    target: b,
    type: null,
    direction: 'any',
    maxHops: 1,
    mode: 'required',
    via: 'relation',
  }
  return { ...p, edges: [...p.edges, edge] }
}

export const removeEdge = (p: Pattern, key: string): Pattern => ({
  ...p,
  edges: p.edges.filter((e) => e.key !== key),
})

export const removeNode = (p: Pattern, key: string): Pattern => ({
  nodes: p.nodes.filter((n) => n.key !== key),
  edges: p.edges.filter((e) => e.source !== key && e.target !== key),
})

export const moveNode = (p: Pattern, key: string, x: number, y: number): Pattern => ({
  ...p,
  nodes: p.nodes.map((n) => (n.key === key ? { ...n, x, y } : n)),
})

/** Keys reachable from `start` along the given links. */
function reach(edges: readonly PatternEdge[], start: string): Set<string> {
  const seen = new Set([start])
  let grew = true
  while (grew) {
    grew = false
    for (const e of edges) {
      const touches = seen.has(e.source) || seen.has(e.target)
      if (touches && !(seen.has(e.source) && seen.has(e.target))) {
        seen.add(e.source)
        seen.add(e.target)
        grew = true
      }
    }
  }
  return seen
}

const linksOf = (p: Pattern, key: string) =>
  p.edges.filter((e) => e.source === key || e.target === key)

/** Sought nodes reached only by one optional link: empty in a match when it is missing. */
export function optionalLeaves(p: Pattern): Set<string> {
  return new Set(
    p.nodes
      .filter((n) => !n.known)
      .filter((n) => {
        const links = linksOf(p, n.key)
        return links.length === 1 && links[0].mode === 'optional'
      })
      .map((n) => n.key)
  )
}

/** Known nodes linked only by links that must not exist: kept out of matches, never matched. */
export function excluded(p: Pattern): Set<string> {
  return new Set(
    p.nodes
      .filter((n) => n.known)
      .filter((n) => {
        const links = linksOf(p, n.key)
        return links.length > 0 && links.every((e) => e.mode === 'not')
      })
      .map((n) => n.key)
  )
}

/** Nodes every match must have, which must hang together by required links. */
function core(p: Pattern): PatternNode[] {
  const aside = new Set([...optionalLeaves(p), ...excluded(p)])
  return p.nodes.filter((n) => !aside.has(n.key))
}

/** Nodes not linked to the rest yet, which the question cannot be asked with. */
export function loose(p: Pattern): PatternNode[] {
  const must = core(p)
  if (must.length < 2) return []
  const required = p.edges.filter((e) => e.mode === 'required')
  const groups: Set<string>[] = []
  for (const n of must) {
    if (!groups.some((g) => g.has(n.key))) groups.push(reach(required, n.key))
  }
  const biggest = groups.reduce((a, b) => (b.size > a.size ? b : a))
  return groups.length > 1 ? must.filter((n) => !biggest.has(n.key)) : []
}

export const updateNode = (p: Pattern, key: string, change: Partial<PatternNode>): Pattern => ({
  ...p,
  nodes: p.nodes.map((n) => (n.key === key ? { ...n, ...change } : n)),
})

export const updateEdge = (p: Pattern, key: string, change: Partial<PatternEdge>): Pattern => ({
  ...p,
  edges: p.edges.map((e) => (e.key === key ? { ...e, ...change } : e)),
})

/** Why the pattern cannot be asked yet, in the user's words; null when it can. */
export function problem(p: Pattern): string | null {
  const leaves = optionalLeaves(p)
  const byKey = new Map(p.nodes.map((n) => [n.key, n]))
  for (const e of p.edges) {
    const ends = [e.source, e.target]
    if (e.mode === 'optional' && ends.filter((k) => leaves.has(k)).length !== 1)
      return 'Opcjonalne połączenie musi prowadzić do szukanej encji, która nie ma innych połączeń'
    if (
      e.mode === 'not' &&
      (ends.some((k) => leaves.has(k)) || ends.every((k) => byKey.get(k)!.known))
    )
      return 'Wykluczone połączenie musi dotyczyć szukanej encji'
  }
  if (!core(p).some((n) => !n.known))
    return 'Dodaj encję, której szukasz: „Dodaj szukaną encję” na górnym pasku'
  if (loose(p).length)
    return 'Połącz wszystkie węzły: przeciągnij od kropki przy węźle do drugiego węzła'
  return null
}

export function toBody(p: Pattern): QueryBody {
  return {
    nodes: p.nodes.map((n) =>
      n.known
        ? {
            key: n.key,
            ids: n.known.map((e) => e.id),
            ...(n.atLeast !== null ? { at_least: n.atLeast } : {}),
          }
        : {
            key: n.key,
            ...(n.label ? { label: n.label } : {}),
            ...(n.linkCount
              ? {
                  link_count: {
                    min: n.linkCount.min,
                    ...(n.linkCount.type ? { type: n.linkCount.type } : {}),
                    ...(n.linkCount.label ? { label: n.linkCount.label } : {}),
                  },
                }
              : {}),
            ...(n.nameContains.trim() ? { name_contains: n.nameContains.trim() } : {}),
          }
    ),
    edges: p.edges.map((e) => ({
      source: e.source,
      target: e.target,
      // A shared article has no relationship, way or length of its own.
      ...(e.type && e.via === 'relation' ? { type: e.type } : {}),
      direction: e.via === 'relation' ? e.direction : 'any',
      min_hops: 1,
      max_hops: e.via === 'relation' ? e.maxHops : 1,
      mode: e.mode,
      via: e.via,
    })),
  }
}

/** The type a node stands for, when one type covers it. */
export function labelOf(node: PatternNode): string | null {
  if (!node.known) return node.label
  const labels = new Set(node.known.map((e) => e.label))
  return labels.size === 1 ? [...labels][0] : null
}

/** Another entity into a known node, unless it is in the question already. */
export function addToGroup(p: Pattern, key: string, entity: LoadedNode): Pattern {
  if (p.nodes.some((n) => n.known?.some((e) => e.id === entity.id))) return p
  return {
    ...p,
    nodes: p.nodes.map((n) =>
      n.key === key && n.known ? { ...n, known: [...n.known, entity] } : n
    ),
  }
}

/** An entity out of a known node; the node goes with its last one. */
export function removeFromGroup(p: Pattern, key: string, id: string): Pattern {
  const node = p.nodes.find((n) => n.key === key)
  const left = node?.known?.filter((e) => e.id !== id) ?? []
  if (!left.length) return removeNode(p, key)
  // "At least" never asks for more entities than are left.
  const atLeast = node!.atLeast !== null && node!.atLeast <= left.length ? node!.atLeast : null
  return updateNode(p, key, { known: left, atLeast: left.length > 1 ? atLeast : null })
}
