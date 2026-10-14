import type { ReactNode } from 'react'
import { ConstellationField } from './ConstellationField'
import type { Ink } from './spaceVisuals'

interface Props {
  spaceId: string
  ink: Ink
  /** Picked up off the pile and held towards the viewer, instead of lying on the table. */
  lifted: boolean
  sketch?: boolean
  /** A blank sheet: frame and grid only, for printing a list on. */
  bare?: boolean
  /** Printed over the map; once the sheet is lifted the map fades back to make room. */
  children?: ReactNode
}

// A space drawn as a printed map sheet. Lying on the table it only casts a tight
// shadow; picked up it throws a broad soft one with a wash of the space's ink.
export function MapSheet({ spaceId, ink, lifted, sketch = false, bare = false, children }: Props) {
  return (
    <div className="relative w-full">
      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-700"
        style={{
          boxShadow: `0 1px 2px rgb(15 23 42 / 0.12), 0 18px 32px -12px rgb(15 23 42 / 0.32), 0 50px 80px -36px ${ink.color}`,
          opacity: lifted ? 1 : 0,
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-700"
        style={{
          boxShadow: '0 1px 1px rgb(15 23 42 / 0.18), 0 3px 6px -2px rgb(15 23 42 / 0.18)',
          opacity: lifted ? 0 : 1,
        }}
      />
      <div className="relative overflow-hidden" style={{ backgroundColor: ink.field }}>
        <div
          aria-hidden="true"
          className="transition-opacity duration-700"
          style={{ opacity: children && lifted ? 0.4 : 1 }}
        >
          <ConstellationField spaceId={spaceId} ink={ink} sketch={sketch} map bare={bare} />
        </div>
        <div aria-hidden="true" className="paper-grain absolute inset-0" />
        {/* Light from the top left across the sheet; a little stronger when it lies flat. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 transition-opacity duration-700"
          style={{
            background:
              'linear-gradient(135deg, rgb(255 255 255 / 0.3), transparent 45%, rgb(15 23 42 / 0.06))',
            opacity: lifted ? 0.6 : 1,
          }}
        />
        {children && <div className="absolute inset-0">{children}</div>}
      </div>
    </div>
  )
}
