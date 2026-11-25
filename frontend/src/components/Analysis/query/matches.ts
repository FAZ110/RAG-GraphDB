import type { QueryResult } from '@/types/query'
import type { Pattern } from './pattern'

export type Match = QueryResult['matches'][number]

export interface MatchGroup {
  /** The entity the group gathers round; null when matches are not grouped. */
  id: string | null
  matches: Match[]
}

/** The sought node matches gather round by default: of those whose entities repeat, the one
 * linked to most other sought nodes, then the one with fewest entities; null when none repeats. */
export function defaultGroupKey(pattern: Pattern, matches: readonly Match[]): string | null {
  const sought = pattern.nodes.filter((n) => !n.known).map((n) => n.key)
  if (sought.length < 2) return null
  const others = new Set(sought)
  const links = (key: string) =>
    pattern.edges.filter(
      (e) =>
        e.mode !== 'not' &&
        ((e.source === key && others.has(e.target)) || (e.target === key && others.has(e.source)))
    ).length
  const distinct = (key: string) => new Set(matches.flatMap((m) => m[key] ?? [])).size
  return (
    sought
      .toSorted((a, b) => links(b) - links(a) || distinct(a) - distinct(b))
      .find((key) => distinct(key) > 0 && distinct(key) < matches.length) ?? null
  )
}

/** Matches in rank order, gathered by the entity standing for `key`; a group comes where its
 * best match does. */
export function groupMatches(matches: readonly Match[], key: string | null): MatchGroup[] {
  if (key === null) return [{ id: null, matches: [...matches] }]
  const groups = new Map<string | null, Match[]>()
  for (const match of matches) {
    const id = match[key] ?? null
    const group = groups.get(id)
    if (group) group.push(match)
    else groups.set(id, [match])
  }
  return [...groups].map(([id, members]) => ({ id, matches: members }))
}
