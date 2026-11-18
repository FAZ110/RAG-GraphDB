import cytoscape from 'cytoscape'
import { describe, expect, it, vi } from 'vitest'
import { routeEdges } from './router'
import { BOW } from './routes'

// Reduced motion, so bends land at once rather than gliding.
vi.stubGlobal('window', { matchMedia: () => ({ matches: true }) })
vi.stubGlobal('cancelAnimationFrame', () => {})

describe('routeEdges', () => {
  it('bows an edge round a node in its way, and straightens it once the way is clear', () => {
    const cy = cytoscape({
      headless: true,
      styleEnabled: true,
      layout: { name: 'preset' },
      elements: [
        { data: { id: 'a' }, position: { x: 0, y: 0 } },
        { data: { id: 'b' }, position: { x: 400, y: 0 } },
        { data: { id: 'c' }, position: { x: 200, y: 0 } },
        { data: { id: 'ab', source: 'a', target: 'b' } },
      ],
    })
    const ab = cy.getElementById('ab')
    routeEdges(cy)
    expect(ab.style('curve-style')).toBe('unbundled-bezier')
    expect(Math.abs(ab.scratch(BOW) as number)).toBeGreaterThan(0)

    cy.getElementById('c').position({ x: 200, y: 300 })
    routeEdges(cy)
    expect(ab.style('curve-style')).not.toBe('unbundled-bezier')
    expect(ab.scratch(BOW)).toBe(0)
  })
})
