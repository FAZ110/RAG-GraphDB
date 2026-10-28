import type { NodeCollection, NodeSingular } from 'cytoscape'
import type { Graphviz } from '@hpcc-js/wasm-graphviz'

// Graphviz is a few megabytes of WebAssembly, so it loads the first time it's needed.
let engine: Promise<Graphviz> | null = null
export const graphviz = () =>
  (engine ??= import('@hpcc-js/wasm-graphviz').then(({ Graphviz }) => Graphviz.load()))

const POINTS_PER_INCH = 72
const quote = (id: string) => `"${id.replace(/["\\]/g, '\\$&')}"`

export interface GraphvizJson {
  objects?: { _gvid: number; name: string; pos?: string }[]
}

/**
 * The canvas in DOT: each node a box the size of it and its label, and one edge per linked pair
 * as long as `lengthOf` asks, in canvas pixels.
 */
export function dotSource(
  nodes: NodeCollection,
  settings: string[],
  lengthOf: (a: string, b: string) => number
) {
  const lines = ['graph {', ...settings, 'node [shape=box, fixedsize=true, label=""]']
  nodes.forEach((n: NodeSingular) => {
    const box = n.boundingBox({ includeLabels: true })
    // Graphviz reads sizes and lengths in inches but writes positions in points.
    lines.push(
      `${quote(n.id())} [width=${box.w / POINTS_PER_INCH}, height=${box.h / POINTS_PER_INCH}]`
    )
  })
  const seen = new Set<string>()
  nodes.edgesWith(nodes).forEach((e) => {
    const [a, b] = [e.source().id(), e.target().id()].toSorted()
    if (a === b || seen.has(`${a}|${b}`)) return
    seen.add(`${a}|${b}`)
    lines.push(`${quote(a)} -- ${quote(b)} [len=${lengthOf(a, b) / POINTS_PER_INCH}]`)
  })
  lines.push('}')
  return lines.join('\n')
}
