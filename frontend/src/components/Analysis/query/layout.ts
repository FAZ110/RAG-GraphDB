export const NODE_W = 176
export const NODE_H = 58

export interface Point {
  x: number
  y: number
}

/**
 * Where the line from `from` towards `to` leaves the box of the node at `from`,
 * `gap` further out so an arrow head stops short of the border.
 */
export function boxEdge(from: Point, to: Point, nodeWidth: number, gap = 0): Point {
  const dx = to.x - from.x
  const dy = to.y - from.y
  if (dx === 0 && dy === 0) return from
  const scale = Math.min(
    dx ? nodeWidth / 2 / Math.abs(dx) : Infinity,
    dy ? NODE_H / 2 / Math.abs(dy) : Infinity
  )
  const length = Math.hypot(dx, dy)
  const out = scale + gap / length
  return { x: from.x + dx * out, y: from.y + dy * out }
}
