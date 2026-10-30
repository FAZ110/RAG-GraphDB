import type Sigma from 'sigma'
import type { MapEdgeAttributes, MapNodeAttributes } from './types'

const GRID = 24
const MIN_SPACING = 12

/** The dotted map paper of the analysis canvas, following sigma's camera. */
export function followPaper(
  sigma: Sigma<MapNodeAttributes, MapEdgeAttributes>,
  element: HTMLElement
) {
  element.style.backgroundImage =
    'radial-gradient(var(--paper-dot, var(--line)) 1px, transparent 1.2px)'
  const draw = () => {
    let size = GRID / sigma.getCamera().getState().ratio
    while (size < MIN_SPACING) size *= 2
    const origin = sigma.graphToViewport({ x: 0, y: 0 })
    element.style.backgroundSize = `${size}px ${size}px`
    element.style.backgroundPosition = `${origin.x}px ${origin.y}px`
  }
  sigma.on('afterRender', draw)
  draw()
  return () => {
    sigma.off('afterRender', draw)
  }
}
