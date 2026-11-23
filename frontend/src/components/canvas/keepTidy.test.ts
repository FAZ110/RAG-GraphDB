import cytoscape from 'cytoscape'
import { describe, expect, it, vi } from 'vitest'
import { keepTidy } from './keepTidy'

// Reduced motion, so the move lands at once rather than gliding.
vi.stubGlobal('window', { matchMedia: () => ({ matches: true }) })

describe('keepTidy', () => {
  it('moves only a node lying on another, leaving the rest where they stand', async () => {
    const cy = cytoscape({
      headless: true,
      styleEnabled: true,
      // The default layout would put every node at the origin.
      layout: { name: 'preset' },
      elements: [
        { data: { id: 'a' }, position: { x: 0, y: 0 } },
        { data: { id: 'b' }, position: { x: 500, y: 0 } },
        { data: { id: 'c' }, position: { x: 5, y: 5 } },
      ],
    })
    const moves = await keepTidy(cy)
    expect(moves.map((m) => m.id)).toEqual(['c'])
    expect(cy.getElementById('a').position()).toEqual({ x: 0, y: 0 })
    expect(cy.getElementById('b').position()).toEqual({ x: 500, y: 0 })
    const c = cy.getElementById('c').position()
    expect(Math.hypot(c.x, c.y)).toBeGreaterThan(30)
  })
})
