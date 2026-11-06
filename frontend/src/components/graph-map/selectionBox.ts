import type { Coordinates } from 'sigma/types'

const CLICK_PX = 4

/** Whether a point lies in the box dragged from `from` to `to`; null for a box too small to be a drag. */
export function selectionBox(from: Coordinates, to: Coordinates) {
  const [x0, x1] = [from.x, to.x].toSorted((a, b) => a - b)
  const [y0, y1] = [from.y, to.y].toSorted((a, b) => a - b)
  if (x1 - x0 < CLICK_PX && y1 - y0 < CLICK_PX) return null
  return (p: Coordinates) => p.x >= x0 && p.x <= x1 && p.y >= y0 && p.y <= y1
}
