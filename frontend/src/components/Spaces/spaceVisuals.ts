// Every space gets a stable look derived from its id: one map ink and a small
// constellation of nodes. Until a space has a real graph thumbnail this is what
// makes the cards recognisable at a glance.

export interface Ink {
  name: string
  color: string
  field: string
}

const INKS: Ink[] = [
  { name: 'morski', color: '#1F5F5B', field: '#EAF2F1' },
  { name: 'indygo', color: '#3A4A8C', field: '#ECEEF6' },
  { name: 'ochra', color: '#9A6B1F', field: '#F6F0E6' },
  { name: 'mech', color: '#4F6B2E', field: '#EEF2E8' },
  { name: 'śliwka', color: '#7A3E62', field: '#F4ECF1' },
  { name: 'stalowy', color: '#3F6E8C', field: '#EAF1F5' },
]

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

function hashString(value: string): number {
  let hash = 2166136261
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function mulberry32(seed: number): () => number {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function inkFor(spaceId: string): Ink {
  return INKS[hashString(spaceId) % INKS.length]
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
  // The first node acts as the hub: larger, like the most connected entity.
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

  return { nodes, edges }
}
