import type { Core } from 'cytoscape'

const GRID = 24
// The closest dots may sit on screen; zoomed further out, the paper keeps every other one.
const MIN_SPACING = 12

/** Dotted map paper behind the canvas, moving and scaling with it so the dots stay put.
 * The dots take `--paper-dot` from the page, e.g. the space's ink. */
export function followPaper(cy: Core, element: HTMLElement) {
  let frame = 0
  element.style.backgroundImage =
    'radial-gradient(var(--paper-dot, var(--line)) 1px, transparent 1.2px)'
  const draw = () => {
    frame = 0
    // Each coarser level keeps a subset of the finer one's dots, so none jump between levels.
    let size = GRID * cy.zoom()
    while (size < MIN_SPACING) size *= 2
    const { x, y } = cy.pan()
    element.style.backgroundSize = `${size}px ${size}px`
    element.style.backgroundPosition = `${x}px ${y}px`
  }
  const schedule = () => {
    frame ||= requestAnimationFrame(draw)
  }
  cy.on('viewport', schedule)
  draw()
  return () => cancelAnimationFrame(frame)
}
