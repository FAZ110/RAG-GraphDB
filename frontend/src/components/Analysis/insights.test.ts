import { describe, expect, it } from 'vitest'
import { insights } from './insights'

const link = (source: string, target: string) => ({ source, target })

describe('insights', () => {
  // A ─ B ─ C ─ D, and C ─ E; A─B drawn twice, as parallel relations are.
  const found = insights(
    ['A', 'B', 'C', 'D', 'E'],
    [link('A', 'B'), link('B', 'A'), link('B', 'C'), link('C', 'D'), link('C', 'E'), link('E', 'E')]
  )

  it('ranks brokers by the shortest paths through them, leaving out the ends', () => {
    expect(found.brokers.map((r) => r.id)).toEqual(['C', 'B'])
    // Of the 6 pairs among the other four, 5 link through C and 3 through B.
    expect(found.brokers[0].score).toBeCloseTo(5 / 6)
    expect(found.brokers[1].score).toBeCloseTo(3 / 6)
  })

  it('counts what each critical entity would cut off', () => {
    expect(found.critical).toEqual([
      { id: 'C', score: 2, cut: ['D', 'E'] },
      { id: 'B', score: 1, cut: ['A'] },
    ])
  })

  it('splits the canvas into densely linked groups named after their hub', () => {
    // Two triangles joined by one relation.
    const two = insights(
      ['A', 'B', 'C', 'X', 'Y', 'Z', 'alone'],
      [
        link('A', 'B'), link('B', 'C'), link('C', 'A'),
        link('X', 'Y'), link('Y', 'Z'), link('Z', 'X'),
        link('C', 'X'),
      ] // prettier-ignore
    )
    expect(two.groups).toEqual([
      { hub: 'C', ids: ['C', 'A', 'B'] },
      { hub: 'X', ids: ['X', 'Y', 'Z'] },
    ])
  })

  it('finds nothing on a canvas without relations', () => {
    expect(insights(['A', 'B'], [])).toEqual({ brokers: [], critical: [], groups: [] })
  })
})
