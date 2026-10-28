import type { Core, NodeCollection, NodeSingular } from 'cytoscape'
import type { Insets } from './types'

const MARGIN = 40

/** The part of the view no panel covers, in rendered pixels. */
export function openArea(cy: Core, insets: Insets) {
  return {
    left: insets.left,
    top: insets.top,
    right: cy.width() - insets.right,
    bottom: cy.height() - insets.bottom,
  }
}

/** The zoom and pan that fit `eles` in the open area, no closer than `maxZoom`. */
export function framing(cy: Core, eles: NodeCollection, insets: Insets, maxZoom: number) {
  const area = openArea(cy, insets)
  const width = area.right - area.left - MARGIN * 2
  const height = area.bottom - area.top - MARGIN * 2
  const box = eles.boundingBox({ includeLabels: true })
  const zoom = Math.min(maxZoom, width / Math.max(box.w, 1), height / Math.max(box.h, 1))
  const center = { x: (box.x1 + box.x2) / 2, y: (box.y1 + box.y2) / 2 }
  return {
    zoom,
    pan: {
      x: (area.left + area.right) / 2 - center.x * zoom,
      y: (area.top + area.bottom) / 2 - center.y * zoom,
    },
  }
}

/**
 * The view that shows `ids` in the open area together with the nodes already visible there;
 * null when they are all in sight already.
 */
export function revealViewport(cy: Core, ids: string[], insets: Insets) {
  const wanted = cy.nodes().filter((n) => ids.includes(n.id()))
  if (wanted.empty()) return null
  const area = openArea(cy, insets)
  const shown = (n: NodeSingular) => {
    const { x, y } = n.renderedPosition()
    return (
      x >= area.left + MARGIN &&
      x <= area.right - MARGIN &&
      y >= area.top + MARGIN &&
      y <= area.bottom - MARGIN
    )
  }
  if (wanted.toArray().every((n) => shown(n as NodeSingular))) return null
  const context = cy.nodes(':visible').filter(shown)
  return framing(cy, wanted.union(context) as NodeCollection, insets, cy.zoom())
}
