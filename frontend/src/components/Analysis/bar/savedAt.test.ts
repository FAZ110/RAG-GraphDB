import { expect, it } from 'vitest'
import { savedAtText } from './savedAt'

const now = new Date(2026, 10, 4, 15, 0).getTime()
const minutesAgo = (m: number) => new Date(now - m * 60_000).toISOString()

it('says "przed chwilą" under a minute', () => {
  expect(savedAtText(minutesAgo(0.2), now)).toBe('przed chwilą')
})

it('counts minutes and shows the time within the hour', () => {
  expect(savedAtText(minutesAgo(3), now)).toBe('3 minuty temu, 14:57')
})

it('says "dziś" later the same day', () => {
  expect(savedAtText(minutesAgo(120), now)).toBe('dziś, 13:00')
})

it('shows the date on another day', () => {
  expect(savedAtText(new Date(2026, 10, 2, 9, 5).toISOString(), now)).toMatch(/^2 lis.* 09:05$/)
})
