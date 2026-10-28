import type { NodeCollection, NodeSingular } from 'cytoscape'
import { communities } from './communities'

// The shortest an edge may be inside a community and between two, and the room its label keeps
// clear at both ends, in canvas pixels.
const INSIDE = 90
const BETWEEN = 200
const LABEL_MARGIN = 12
// An entity's name hangs under it (margin, an 11px line, its halo), so an edge leaving downwards
// crosses it before the relation label may start.
const NODE_LABEL = 22
// The relation labels' type, as the canvas style sets it.
const LABEL_FONT_SIZE = 9

let context: CanvasRenderingContext2D | null = null
function labelWidth(text: string) {
  context ??= document.createElement('canvas').getContext('2d')
  if (!context) return text.length * LABEL_FONT_SIZE * 0.6
  context.font = `${LABEL_FONT_SIZE}px ${getComputedStyle(document.body).fontFamily}`
  return context.measureText(text).width
}

const pairKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`)

/**
 * How long the edge between two linked nodes should be drawn, in pixels: short inside a
 * community and long between them, so densely linked groups gather, and never too short for its
 * longest relation label to fit clear of both nodes and their names.
 */
export function edgeLengths(nodes: NodeCollection) {
  const community = communities(nodes)
  const label = new Map<string, number>()
  nodes.edgesWith(nodes).forEach((e) => {
    const key = pairKey(e.source().id(), e.target().id())
    label.set(key, Math.max(label.get(key) ?? 0, labelWidth(e.data('name') ?? '')))
  })
  const radius = (id: string) => (nodes.getElementById(id) as NodeSingular).width() / 2

  return (a: string, b: string) => {
    const base = community.get(a) === community.get(b) ? INSIDE : BETWEEN
    const ends = radius(a) + radius(b) + 2 * NODE_LABEL
    const fit = (label.get(pairKey(a, b)) ?? 0) + ends + 2 * LABEL_MARGIN
    return Math.max(base, fit)
  }
}
