// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { storedValue } from './storedValue'

const asNumber = { parse: Number, format: String }

afterEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
})

it('starts from the fallback when nothing is stored', () => {
  expect(storedValue('zoom', 1, asNumber).get()).toBe(1)
})

it('reads what was stored and writes what is set', () => {
  localStorage.setItem('zoom', '2')
  const zoom = storedValue('zoom', 1, asNumber)
  expect(zoom.get()).toBe(2)
  zoom.set(3)
  expect(localStorage.getItem('zoom')).toBe('3')
})

it('falls back when stored data cannot be parsed', () => {
  localStorage.setItem('tab', '{broken')
  expect(storedValue('tab', 'graph', { parse: JSON.parse, format: JSON.stringify }).get()).toBe(
    'graph'
  )
})

it('keeps working when storage throws', () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new Error('blocked')
  })
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('blocked')
  })
  const zoom = storedValue('zoom', 1, asNumber)
  zoom.set(5)
  expect(zoom.get()).toBe(5)
})
