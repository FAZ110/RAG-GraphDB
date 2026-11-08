import forceAtlas2 from 'graphology-layout-forceatlas2'
import FA2Layout from 'graphology-layout-forceatlas2/worker'
import type { MapGraph } from './buildGraph'

const MIN_MS = 1500
const MAX_MS = 12000
const MS_PER_NODE = 0.6

export function layoutBudget(order: number): number {
  return Math.min(MAX_MS, MIN_MS + order * MS_PER_NODE)
}

/** Runs ForceAtlas2 off the main thread for a time scaled to the graph, then stops. */
export function runLayout(graph: MapGraph, onDone: () => void): () => void {
  if (graph.order < 2) {
    onDone()
    return () => {}
  }
  const layout = new FA2Layout(graph, {
    settings: { ...forceAtlas2.inferSettings(graph), outboundAttractionDistribution: true },
  })
  layout.start()
  const timer = window.setTimeout(() => {
    layout.stop()
    onDone()
  }, layoutBudget(graph.order))
  return () => {
    window.clearTimeout(timer)
    layout.kill()
  }
}
