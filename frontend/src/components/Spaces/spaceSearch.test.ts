import { describe, expect, it } from 'vitest'
import type { Space } from '@/types'
import { sortSpaces } from './spaceSearch'

const space = (id: string, article_count: number, entity_count: number): Space => ({
  id,
  name: id,
  created_at: '2026-11-01T00:00:00Z',
  article_count,
  entity_count,
})

// In the user's own order.
const SPACES = [space('a', 5, 80), space('b', 40, 10), space('c', 5, 300), space('d', 0, 0)]
const ids = (spaces: Space[]) => spaces.map((s) => s.id)

describe('sortSpaces', () => {
  it("leaves the user's own order alone", () => {
    expect(sortSpaces(SPACES, 'own')).toBe(SPACES)
  })

  it('puts the most articles first and keeps the own order among equals', () => {
    expect(ids(sortSpaces(SPACES, 'articles'))).toEqual(['b', 'a', 'c', 'd'])
  })

  it('puts the most entities first', () => {
    expect(ids(sortSpaces(SPACES, 'entities'))).toEqual(['c', 'a', 'b', 'd'])
  })

  it('does not reorder the list it was given', () => {
    sortSpaces(SPACES, 'articles')
    expect(ids(SPACES)).toEqual(['a', 'b', 'c', 'd'])
  })
})
