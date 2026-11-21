import { describe, expect, it } from 'vitest'
import type { QueryResult } from '@/types/query'
import { loaded, mergePages } from './pages'

const page = (ids: string[], counted: Record<string, number>): QueryResult => ({
  matches: ids.map((x) => ({ x })),
  total: 3,
  counts: { x: 3 },
  counted: { x: counted },
  nodes: [...ids, 'lech'].map((id) => ({ id, name: id, label: 'L', degree: 1, properties: {} })),
  edges: ids.map((id) => ({ id: `e${id}`, source: id, target: 'lech', type: 'GRA_W' })),
  truncated: false,
  cypher: 'MATCH',
  params: {},
})

describe('mergePages', () => {
  it('reads pages as one answer, each entity and link once', () => {
    const pages = [page(['a', 'b'], { a: 3, b: 2 }), page(['c'], { c: 1 })]
    const merged = mergePages(pages)
    expect(merged.matches.map((m) => m.x)).toEqual(['a', 'b', 'c'])
    expect(merged.nodes.map((n) => n.id)).toEqual(['a', 'b', 'lech', 'c'])
    expect(merged.counted.x).toEqual({ a: 3, b: 2, c: 1 })
    expect(loaded(pages)).toBe(3)
  })
})
