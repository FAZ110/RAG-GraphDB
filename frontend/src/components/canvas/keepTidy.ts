import type { Core, NodeSingular } from 'cytoscape'
import type { PlacedId } from '@/types/analysis'
import type { Point } from './routes'
import { separate, settleAt } from './settle'

/**
 * Tidy without rearranging: every node keeps its place unless it overlaps one before it, which
 * then moves to the nearest free spot. Ghosts and hidden types are left out. Resolves with where
 * the moved nodes ended up.
 */
export async function keepTidy(cy: Core): Promise<PlacedId[]> {
  const nodes = cy.nodes().not('.ghost').not('.hidden')
  const at = new Map<string, Point>()
  separate(nodes.slice(0, 0), nodes, at)
  const moved = nodes.filter((n) => {
    const p = (n as NodeSingular).position()
    const to = at.get(n.id())!
    return p.x !== to.x || p.y !== to.y
  })
  if (moved.empty()) return []
  return settleAt(moved, at)
}
