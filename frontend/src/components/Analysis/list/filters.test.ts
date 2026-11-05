import { describe, expect, it } from 'vitest'
import type { AnalysisListItem } from '@/types/analysis'
import { applyFilters, narrowed } from './filters'
import type { Filters } from './filters'

const DAY = 86_400_000
const now = Date.UTC(2026, 10, 4)

const analysis = (
  id: string,
  space_id: string,
  name: string,
  daysAgo: number
): AnalysisListItem => ({
  id,
  space_id,
  space_name: space_id,
  name,
  created_at: new Date(now - daysAgo * DAY).toISOString(),
  updated_at: new Date(now - daysAgo * DAY).toISOString(),
  entity_count: 0,
  labels: [],
})

const LIST = [
  analysis('1', 's1', 'Śledztwo w Łodzi', 1),
  analysis('2', 's1', 'Transfery', 20),
  analysis('3', 's2', 'Mecze ligowe', 60),
  analysis('4', 's3', 'Stare notatki', 400),
]
const none: Filters = { onlySpace: false, query: '', spaces: [], period: 'any' }
const ids = (f: Partial<Filters>, spaceId?: string) =>
  applyFilters(LIST, { ...none, ...f }, spaceId, now).map((a) => a.id)

describe('applyFilters', () => {
  it('keeps everything without filters', () => {
    expect(ids({})).toEqual(['1', '2', '3', '4'])
  })

  it('the space tab shows only the picked space', () => {
    expect(ids({ onlySpace: true }, 's1')).toEqual(['1', '2'])
  })

  it('the space tab ignores the spaces chosen for "all"', () => {
    expect(ids({ onlySpace: true, spaces: ['s2'] }, 's1')).toEqual(['1', '2'])
  })

  it('narrows "all" to the chosen spaces', () => {
    expect(ids({ spaces: ['s2', 's3'] })).toEqual(['3', '4'])
  })

  it('matches the name regardless of case and Polish letters', () => {
    expect(ids({ query: '  sledztwo w lodzi ' })).toEqual(['1'])
  })

  it('keeps only analyses changed within the period', () => {
    expect(ids({ period: '7' })).toEqual(['1'])
    expect(ids({ period: '30' })).toEqual(['1', '2'])
    expect(ids({ period: '90' })).toEqual(['1', '2', '3'])
  })

  it('combines the filters', () => {
    // "e" matches 1, 2 and 3: space s1 leaves 1 and 2, the period keeps both, "tr" only 2.
    expect(ids({ query: 'e', period: '90', spaces: ['s1'] })).toEqual(['1', '2'])
    expect(ids({ query: 'tr', period: '90', spaces: ['s1'] })).toEqual(['2'])
  })
})

describe('narrowed', () => {
  it('is false for the space tab alone', () => {
    expect(narrowed({ ...none, onlySpace: true, spaces: ['s1'] })).toBe(false)
  })

  it('is true for a query, chosen spaces or a period', () => {
    expect(narrowed({ ...none, query: 'x' })).toBe(true)
    expect(narrowed({ ...none, query: '   ' })).toBe(false)
    expect(narrowed({ ...none, spaces: ['s1'] })).toBe(true)
    expect(narrowed({ ...none, period: '7' })).toBe(true)
  })
})
