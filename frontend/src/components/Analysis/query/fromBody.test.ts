import { describe, expect, it } from 'vitest'
import type { LoadedNode } from '@/types'
import type { QueryBody } from '@/types/query'
import { fromBody } from './fromBody'
import { problem, toBody } from './pattern'

const entity = (id: string, label: string): LoadedNode => ({
  id,
  label,
  name: id,
  degree: 1,
  properties: {},
})

const body: QueryBody = {
  nodes: [
    { key: 'k1', ids: ['legia', 'lech'], at_least: 2 },
    { key: 'x1', label: 'ZAWODNIK', link_count: { min: 3, type: 'GRA_W' } },
    { key: 'x2', name_contains: 'Wisła' },
  ],
  edges: [
    {
      source: 'x1',
      target: 'k1',
      type: 'GRA_W',
      direction: 'out',
      min_hops: 1,
      max_hops: 1,
      mode: 'required',
      via: 'relation',
    },
    {
      source: 'x1',
      target: 'x2',
      direction: 'any',
      min_hops: 1,
      max_hops: 2,
      mode: 'required',
      via: 'relation',
    },
  ],
}
const entities = [entity('legia', 'KLUB'), entity('lech', 'KLUB')]

describe('fromBody', () => {
  it('draws the pattern the API gave back, asked the same way again', () => {
    const pattern = fromBody(body, entities)
    expect(problem(pattern)).toBeNull()
    expect(toBody(pattern)).toEqual({
      ...body,
      nodes: [
        { key: 'x1', label: 'ZAWODNIK', link_count: { min: 3, type: 'GRA_W' } },
        { key: 'x2', name_contains: 'Wisła' },
        { key: 'k1', ids: ['legia', 'lech'], at_least: 2 },
      ],
    })
  })

  it('puts the sought entities above the known ones, spread across', () => {
    const pattern = fromBody(body, entities)
    const at = (key: string) => pattern.nodes.find((n) => n.key === key)!
    expect(at('x1').y).toBeLessThan(at('k1').y)
    expect(at('x1').x).toBeLessThan(at('x2').x)
    expect(at('k1').x).toBe(0.5)
  })

  it('leaves out a known node whose entities did not come, with its links', () => {
    const pattern = fromBody(body, [])
    expect(pattern.nodes.map((n) => n.key)).toEqual(['x1', 'x2'])
    expect(pattern.edges.map((e) => e.target)).toEqual(['x2'])
  })

  it('drops "at least" above the entities that came', () => {
    const pattern = fromBody(body, [entities[0]])
    expect(pattern.nodes.find((n) => n.key === 'k1')!.atLeast).toBeNull()
  })
})
