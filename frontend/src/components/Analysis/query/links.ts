import type { LoadedEdge } from '@/types'

/** An entity as the answer knows it, to name and colour it. */
export interface Known {
  id: string
  name: string
  label: string | null
}

/** One entity tied to the result, and every relationship between the two. */
export interface Tie {
  other: Known
  /** `out`: the result does it ("gra w →"); otherwise the other one does ("← gra w"). */
  rels: { key: string; type: string; out: boolean }[]
}

/** The result's ties grouped by the entity at their other end, so each is drawn once. */
export function tiesOf(id: string, edges: readonly LoadedEdge[], known: Map<string, Known>): Tie[] {
  const ties = new Map<string, Tie>()
  for (const e of edges) {
    if (e.source !== id && e.target !== id) continue
    const otherId = e.source === id ? e.target : e.source
    const tie = ties.get(otherId) ?? {
      other: known.get(otherId) ?? { id: otherId, name: '…', label: null },
      rels: [],
    }
    const out = e.source === id
    if (!tie.rels.some((r) => r.type === e.type && r.out === out))
      tie.rels.push({ key: e.id, type: e.type, out })
    ties.set(otherId, tie)
  }
  return [...ties.values()]
}
