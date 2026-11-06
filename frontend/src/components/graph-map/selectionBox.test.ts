import { expect, it } from 'vitest'
import { selectionBox } from './selectionBox'

it('holds the points inside the box, edges included, whichever way it was dragged', () => {
  const contains = selectionBox({ x: 100, y: 100 }, { x: 0, y: 0 })!
  expect(contains({ x: 50, y: 50 })).toBe(true)
  expect(contains({ x: 0, y: 100 })).toBe(true)
  expect(contains({ x: 101, y: 50 })).toBe(false)
  expect(contains({ x: 50, y: -1 })).toBe(false)
})

it('takes a box too small to be a drag for a click', () => {
  expect(selectionBox({ x: 10, y: 10 }, { x: 12, y: 13 })).toBeNull()
  expect(selectionBox({ x: 10, y: 10 }, { x: 10, y: 30 })).not.toBeNull()
})
