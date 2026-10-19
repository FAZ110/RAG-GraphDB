import { hashString } from '@/lib/hash'

export interface ConstellationNode {
  x: number
  y: number
  r: number
}

export interface Constellation {
  nodes: ConstellationNode[]
  edges: [number, number][]
}

export const FIELD_WIDTH = 240
export const FIELD_HEIGHT = 150

const PADDING = 16
const MIN_DISTANCE = 30

function mulberry32(seed: number): () => number {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function constellationFor(spaceId: string): Constellation {
  const random = mulberry32(hashString(spaceId))
  const target = 6 + Math.floor(random() * 4)

  const nodes: ConstellationNode[] = []
  for (let attempt = 0; nodes.length < target && attempt < 200; attempt++) {
    const x = PADDING + random() * (FIELD_WIDTH - 2 * PADDING)
    const y = PADDING + random() * (FIELD_HEIGHT - 2 * PADDING)
    if (nodes.every((n) => Math.hypot(n.x - x, n.y - y) >= MIN_DISTANCE)) {
      nodes.push({ x, y, r: 2.5 + random() * 2 })
    }
  }
  nodes[0].r = 6

  // Minimum spanning tree (Prim) keeps every link short, then the two shortest
  // missing links are closed so it reads as a graph, not a path.
  const edges: [number, number][] = []
  const distance = (a: number, b: number) =>
    Math.hypot(nodes[a].x - nodes[b].x, nodes[a].y - nodes[b].y)
  const inTree = new Set([0])
  while (inTree.size < nodes.length) {
    let best: [number, number] | null = null
    for (const a of inTree) {
      for (let b = 0; b < nodes.length; b++) {
        if (inTree.has(b)) continue
        if (!best || distance(a, b) < distance(...best)) best = [a, b]
      }
    }
    edges.push(best!)
    inTree.add(best![1])
  }
  const linked = new Set(edges.map(([a, b]) => `${a}-${b}`))
  const missing: [number, number][] = []
  for (let a = 0; a < nodes.length; a++) {
    for (let b = a + 1; b < nodes.length; b++) {
      if (!linked.has(`${a}-${b}`) && !linked.has(`${b}-${a}`)) missing.push([a, b])
    }
  }
  missing.sort((p, q) => distance(...p) - distance(...q))
  edges.push(...missing.slice(0, 2))

  return { nodes: centered(nodes), edges }
}

// Random points rarely balance out, so the drawing is moved to sit in the middle of the field.
function centered(nodes: ConstellationNode[]): ConstellationNode[] {
  const xs = nodes.map((n) => n.x)
  const ys = nodes.map((n) => n.y)
  const dx = FIELD_WIDTH / 2 - (Math.min(...xs) + Math.max(...xs)) / 2
  const dy = FIELD_HEIGHT / 2 - (Math.min(...ys) + Math.max(...ys)) / 2
  return nodes.map((n) => ({ ...n, x: n.x + dx, y: n.y + dy }))
}

export function stretchToHeight(constellation: Constellation, height: number): Constellation {
  const scale = (height - 2 * PADDING) / (FIELD_HEIGHT - 2 * PADDING)
  return {
    ...constellation,
    nodes: constellation.nodes.map((n) => ({ ...n, y: PADDING + (n.y - PADDING) * scale })),
  }
}
