import type { BoundingBox12, Core, EdgeCollection, EdgeSingular } from 'cytoscape'
import { unbend } from './routes'

// Force-directed edge routing, as netgraph's curved edges and yFiles' organic router do it:
// each route bows by one offset, pulled straight by a spring and pushed off the nodes, labels
// and other edges it runs into, while the pushes cool down. Routes with nothing near stay
// straight; relations sharing a pair travel as one fan.
const ITERATIONS = 60
const START_STEP = 10
const NODE_CLEARANCE = 8
const EDGE_CLEARANCE = 8
const SPRING = 1.2
const MAX_BOW = 0.28
const STRAIGHT_BELOW = 4
const FAN_SPACING = 22
// Where along an edge it is tested, and how much its bow moves it there (4t(1-t) of the apex).
const SAMPLES = [0.2, 0.35, 0.5, 0.65, 0.8].map((t) => ({ t, w: 4 * t * (1 - t) }))
const MIDDLE = SAMPLES.slice(1, 4)

type Point = { x: number; y: number }

interface Route {
  edges: EdgeSingular[]
  ends: Set<string>
  s: Point
  u: Point
  n: Point
  length: number
  /** How wide the fan is on each side of the route's line. */
  half: number
  bow: number
  nodes: BoundingBox12[]
  near: Route[]
  box: BoundingBox12
}

const at = (r: Route, t: number, w: number, bow = r.bow): Point => ({
  x: r.s.x + r.u.x * r.length * t + r.n.x * bow * w,
  y: r.s.y + r.u.y * r.length * t + r.n.y * bow * w,
})

const overlap = (a: BoundingBox12, b: BoundingBox12) =>
  a.x1 < b.x2 && b.x1 < a.x2 && a.y1 < b.y2 && b.y1 < a.y2

/** How hard a box pushes a point sideways off an edge with normal `n`; none past the clearance. */
function pushFrom(box: BoundingBox12, p: Point, n: Point): number {
  const qx = Math.max(box.x1, Math.min(p.x, box.x2))
  const qy = Math.max(box.y1, Math.min(p.y, box.y2))
  const dx = p.x - qx
  const dy = p.y - qy
  const d = Math.hypot(dx, dy)
  if (d >= NODE_CLEARANCE) return 0
  if (d > 0) return ((dx * n.x + dy * n.y) / d) * (1 - d / NODE_CLEARANCE)
  // Inside the box: out to the side its middle isn't on.
  const side = ((box.x1 + box.x2) / 2 - p.x) * n.x + ((box.y1 + box.y2) / 2 - p.y) * n.y
  return side > 0 ? -1.5 : 1.5
}

function routeOf(edges: EdgeCollection, boxes: Map<string, BoundingBox12>): Route | null {
  const first = edges[0]
  const s = first.source().position()
  const t = first.target().position()
  const length = Math.hypot(t.x - s.x, t.y - s.y)
  if (length < 1) return null
  const u = { x: (t.x - s.x) / length, y: (t.y - s.y) / length }
  const half = ((edges.length - 1) * FAN_SPACING) / 2
  const reach = length * MAX_BOW + half + NODE_CLEARANCE
  const box = {
    x1: Math.min(s.x, t.x) - reach,
    x2: Math.max(s.x, t.x) + reach,
    y1: Math.min(s.y, t.y) - reach,
    y2: Math.max(s.y, t.y) + reach,
  }
  const ends = new Set([first.source().id(), first.target().id()])
  const nodes = [...boxes].filter(([id, b]) => !ends.has(id) && overlap(b, box)).map(([, b]) => b)
  const n = { x: -u.y, y: u.x }
  return {
    edges: edges.toArray() as EdgeSingular[],
    ends,
    s,
    u,
    n,
    length,
    half,
    bow: 0,
    nodes,
    near: [],
    box,
  }
}

/** The push on a route's bow from everything around it, summed along the edge. */
function force(r: Route): number {
  let f = (-SPRING * r.bow) / r.length
  for (const { t, w } of SAMPLES) {
    // A fan is tested along both its outer edges.
    for (const side of r.half ? [-r.half, r.half] : [0]) {
      const p = at(r, t, w, r.bow + side)
      for (const box of r.nodes) f += pushFrom(box, p, r.n) * w
    }
  }
  // Edges meeting at a node may run close there; only their middles keep apart.
  for (const other of r.near) {
    for (const { t, w } of MIDDLE) {
      const p = at(r, t, w)
      for (const o of MIDDLE) {
        const q = at(other, o.t, o.w)
        const dx = p.x - q.x
        const dy = p.y - q.y
        const d = Math.hypot(dx, dy)
        if (d >= EDGE_CLEARANCE + r.half + other.half || d === 0) continue
        f += ((dx * r.n.x + dy * r.n.y) / d) * (1 - d / (EDGE_CLEARANCE + r.half + other.half)) * w
      }
    }
  }
  return f
}

/** How many of a route's points sit in a node or too near another edge, at a given bow. */
function collisions(r: Route, bow: number): number {
  let hits = 0
  for (const { t, w } of SAMPLES) {
    for (const side of r.half ? [-r.half, r.half] : [0]) {
      const p = at(r, t, w, bow + side)
      hits += r.nodes.filter((b) => p.x > b.x1 && p.x < b.x2 && p.y > b.y1 && p.y < b.y2).length
    }
  }
  for (const other of r.near) {
    for (const { t, w } of MIDDLE) {
      const p = at(r, t, w, bow)
      const gap = EDGE_CLEARANCE / 2 + r.half + other.half
      hits += MIDDLE.filter((o) => {
        const q = at(other, o.t, o.w)
        return Math.hypot(p.x - q.x, p.y - q.y) < gap
      }).length
    }
  }
  return hits
}

/** Draw each edge of a route: its own place in the fan, measured from its own direction. */
function draw(r: Route) {
  r.edges.forEach((edge, i) => {
    const offset = r.bow + i * FAN_SPACING - r.half
    const flipped = edge.source().id() !== r.edges[0].source().id()
    // A plain edge in a fan would be fanned again by Cytoscape, so only lone ones go back.
    if (r.edges.length === 1 && Math.abs(offset) < STRAIGHT_BELOW) return unbend(edge)
    // One control point at the middle; the curve's apex sits halfway out to it.
    edge.style({
      'curve-style': 'unbundled-bezier',
      'control-point-distances': [2 * (flipped ? -offset : offset)],
      'control-point-weights': [0.5],
    })
  })
}

/**
 * Bow the edges that run through other nodes, their labels or each other into arcs that fit
 * the space around them; the rest stay straight. Ghosts are left as they are.
 */
export function routeEdges(cy: Core) {
  const nodes = cy.nodes().not('.ghost').not('.hidden')
  const boxes = new Map(nodes.map((n) => [n.id(), n.boundingBox({ includeLabels: true })]))
  const routes: Route[] = []
  const seen = new Set<string>()
  nodes.edgesWith(nodes).forEach((edge) => {
    if (seen.has(edge.id())) return
    const fan = edge.parallelEdges().intersection(nodes.edgesWith(nodes))
    fan.forEach((e) => void seen.add(e.id()))
    const route = routeOf(fan, boxes)
    if (route) routes.push(route)
    else fan.forEach(unbend)
  })
  const shares = (a: Route, b: Route) => [...a.ends].some((id) => b.ends.has(id))
  for (const r of routes) {
    r.near = routes.filter((o) => o !== r && !shares(o, r) && overlap(o.box, r.box))
  }

  for (let i = 0; i < ITERATIONS; i++) {
    const step = START_STEP * (1 - i / ITERATIONS) + 0.5
    const pushes = routes.map(force)
    routes.forEach((r, k) => {
      const limit = r.length * MAX_BOW
      const move = Math.max(-step, Math.min(step, pushes[k] * step))
      r.bow = Math.max(-limit, Math.min(limit, r.bow + move))
    })
  }
  // A bow that clears nothing only makes the edge harder to follow; it goes back straight.
  for (const r of routes) if (collisions(r, r.bow) >= collisions(r, 0)) r.bow = 0
  cy.batch(() => routes.forEach(draw))
}
