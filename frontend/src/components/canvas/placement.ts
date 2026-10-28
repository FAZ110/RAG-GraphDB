import type { Point } from '@/types/analysis'

const MIN_GAP = 76
const FIRST_RING = 170
const RING_STEP = 80

const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y)

// Neighbours on a ring sit a hair under MIN_GAP apart, as the ring holds a whole number of them.
const isFree = (spot: Point, taken: readonly Point[]) =>
  taken.every((point) => distance(point, spot) >= MIN_GAP * 0.95)

const onRing = (center: Point, radius: number, angle: number): Point => ({
  x: center.x + radius * Math.cos(angle),
  y: center.y + radius * Math.sin(angle),
})

/**
 * `count` clear spots around `center`, filling rings outward, each ring holding as many as fit
 * apart. Spots read clockwise from the top, so the first proposals sit where the eye starts.
 */
export function spreadAround(center: Point, count: number, taken: readonly Point[]): Point[] {
  const occupied = [...taken, center]
  const spots: Point[] = []
  for (let radius = FIRST_RING; spots.length < count; radius += RING_STEP) {
    const slots = Math.floor((2 * Math.PI * radius) / MIN_GAP)
    // A partly filled last ring spreads its spots over the whole circle.
    const used = Math.min(slots, count - spots.length)
    for (let i = 0; i < used && spots.length < count; i += 1) {
      const spot = onRing(center, radius, -Math.PI / 2 + (2 * Math.PI * i) / used)
      if (!isFree(spot, occupied)) continue
      spots.push(spot)
      occupied.push(spot)
    }
  }
  return spots
}

/** The first clear spot near `center`, for an entity with no neighbour on the canvas. */
export function freeSpot(center: Point, taken: readonly Point[]): Point {
  return isFree(center, taken) ? center : spreadAround(center, 1, taken)[0]
}

/** Spots strung between `from` and `to`, bowed sideways by `bow` so routes don't overlap. */
export function alongLine(from: Point, to: Point, count: number, bow: number): Point[] {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const length = Math.hypot(dx, dy) || 1
  const normal = { x: -dy / length, y: dx / length }
  return Array.from({ length: count }, (_, i) => {
    const t = (i + 1) / (count + 1)
    const sway = bow * Math.sin(Math.PI * t)
    return { x: from.x + dx * t + normal.x * sway, y: from.y + dy * t + normal.y * sway }
  })
}

export function centroid(points: readonly Point[]): Point {
  if (points.length === 0) return { x: 0, y: 0 }
  const sum = points.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 })
  return { x: sum.x / points.length, y: sum.y / points.length }
}

/** A block of spots to the right of everything on the canvas, for a batch with no anchor. */
export function blockBeside(taken: readonly Point[], count: number): Point[] {
  const right = taken.length ? Math.max(...taken.map((p) => p.x)) + MIN_GAP * 2 : 0
  const top = taken.length ? Math.min(...taken.map((p) => p.y)) : 0
  const columns = Math.ceil(Math.sqrt(count))
  return Array.from({ length: count }, (_, i) => ({
    x: right + (i % columns) * MIN_GAP * 1.6,
    y: top + Math.floor(i / columns) * MIN_GAP,
  }))
}
