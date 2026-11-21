import type { QueryResult } from '@/types/query'

/** Pages of one answer read as one: their matches in order, entities and links each once. */
export function mergePages(pages: readonly QueryResult[]): QueryResult {
  const [first] = pages
  const once = <T extends { id: string }>(items: T[]) => [
    ...new Map(items.map((item) => [item.id, item])).values(),
  ]
  const counted: QueryResult['counted'] = {}
  for (const page of pages)
    for (const [key, tally] of Object.entries(page.counted))
      counted[key] = { ...counted[key], ...tally }
  return {
    ...first,
    matches: pages.flatMap((p) => p.matches),
    nodes: once(pages.flatMap((p) => p.nodes)),
    edges: once(pages.flatMap((p) => p.edges)),
    counted,
  }
}

/** How many matches the pages hold. */
export const loaded = (pages: readonly QueryResult[]) =>
  pages.reduce((n, page) => n + page.matches.length, 0)
