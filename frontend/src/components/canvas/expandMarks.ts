import type { Core, NodeSingular } from 'cytoscape'

// Below this many pixels across, a dot is too small to carry a mark.
const MIN_SIZE = 9
const PLUS =
  '<svg viewBox="0 0 24 24" width="100%" height="100%" aria-hidden="true"><path d="M12 7.5v9M7.5 12h9" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" fill="none"/></svg>'

/**
 * A plus over each node classed `expandable`, as plain HTML on `layer`, moved with every frame
 * the canvas draws. Drawn into the canvas, it would shift against its dot as Cytoscape swaps
 * cached textures while zooming; over it, it stays centred and sharp. It takes no pointer, so
 * the node beneath can still be picked and dragged.
 */
export function followExpandMarks(cy: Core, layer: HTMLElement) {
  const marks = new Map<string, HTMLElement>()

  const mark = (id: string) => {
    let el = marks.get(id)
    if (!el) {
      el = document.createElement('span')
      el.className = 'pointer-events-none absolute top-0 left-0 text-page'
      el.innerHTML = PLUS
      layer.append(el)
      marks.set(id, el)
    }
    return el
  }

  const draw = () => {
    const shown = new Set<string>()
    cy.nodes('.expandable').forEach((n: NodeSingular) => {
      const size = n.renderedWidth()
      if (!n.visible() || size < MIN_SIZE) return
      const { x, y } = n.renderedPosition()
      const el = mark(n.id())
      el.style.width = `${size}px`
      el.style.height = `${size}px`
      el.style.transform = `translate(${x - size / 2}px, ${y - size / 2}px)`
      el.style.opacity = String(n.effectiveOpacity())
      shown.add(n.id())
    })
    for (const [id, el] of marks) {
      if (shown.has(id)) continue
      el.remove()
      marks.delete(id)
    }
  }

  cy.on('render', draw)
  return () => {
    cy.off('render', draw)
    marks.forEach((el) => el.remove())
  }
}
