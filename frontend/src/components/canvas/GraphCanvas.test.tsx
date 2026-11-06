// @vitest-environment jsdom
import { render } from '@testing-library/react'
import cytoscape from 'cytoscape'
import type { Core } from 'cytoscape'
import { StrictMode } from 'react'
import { expect, it, vi } from 'vitest'
import { GraphCanvas } from './GraphCanvas'

// jsdom draws nothing; cytoscape only needs a 2d context that takes every call.
const anything: unknown = new Proxy(() => anything, {
  get: (_, key) => (key === Symbol.toPrimitive ? () => 1 : anything),
  apply: () => anything,
})
vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(anything as never)
// Without the app's CSS every themed style is empty, and cytoscape warns about each one.
cytoscape.warnings(false)

it('restores the saved viewport though StrictMode builds the canvas twice', () => {
  const { container } = render(
    <StrictMode>
      <GraphCanvas
        nodes={[{ id: 'a', name: 'A', label: 'Person', degree: 0, x: 0, y: 0 }]}
        edges={[]}
        selected={[]}
        highlight={{ lit: null, route: new Set(), hiddenLabels: new Set() }}
        initialViewport={{ x: 120, y: 80, zoom: 0.5 }}
        onSelect={() => {}}
        onGhostClick={() => {}}
        onHover={() => {}}
        onMove={() => {}}
        insets={() => ({ top: 0, right: 0, bottom: 0, left: 0 })}
      />
    </StrictMode>
  )
  const host = [...container.querySelectorAll('div')].find((d) => '_cyreg' in d) as unknown as {
    _cyreg: { cy: Core }
  }
  expect(host._cyreg.cy.pan()).toEqual({ x: 120, y: 80 })
  expect(host._cyreg.cy.zoom()).toBe(0.5)
})
