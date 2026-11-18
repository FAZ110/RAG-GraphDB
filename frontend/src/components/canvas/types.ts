import type { PlacedId, Point, Viewport } from '@/types/analysis'

export interface CanvasNode extends Point {
  id: string
  name: string
  label: string
  degree: number
  /** In place of its type's colour and the size its links give it, e.g. for a group. */
  color?: string
  size?: number
  /** Drawn with an ink ring, e.g. one the canvas would fall apart without. */
  ring?: boolean
  /** A proposal not yet on the canvas: pale, dashed, added with a click. */
  ghost?: boolean
}

export interface CanvasEdge {
  id: string
  source: string
  target: string
  type: string
  ghost?: boolean
}

export interface CanvasHighlight {
  /** Lit nodes and edges; everything else dims. Null lights everything. */
  lit: ReadonlySet<string> | null
  /** Nodes and edges of a route, drawn in ink. */
  route: ReadonlySet<string>
  /** Entity types left off the canvas for now. */
  hiddenLabels: ReadonlySet<string>
}

/** How much of each edge of the canvas is covered by panels floating over it, in pixels. */
export interface Insets {
  top: number
  right: number
  bottom: number
  left: number
}

/**
 * Keep: nothing moves but what overlaps. Refined: laid out afresh with stress, edges sized for
 * their labels, communities. Basic: springs alone, from where things stand.
 */
export type TidyWay = 'keep' | 'refined' | 'basic'

export interface CanvasHandle {
  fit: (ids?: string[]) => void
  /** Bring these nodes into the uncovered part of the view, keeping what is in view there. */
  reveal: (ids: string[]) => void
  zoomBy: (factor: number) => void
  /** The model point at the middle of the open view, where new things go by default. */
  center: () => Point
  viewport: () => Viewport
  /** Lay out without overlaps: only `moving` if given, the rest staying put; otherwise all. */
  arrange: (moving?: readonly string[]) => Promise<PlacedId[]>
  /** Given `only`, lay just those out afresh where they stand, the rest staying put. */
  tidy: (way?: TidyWay, only?: readonly string[]) => Promise<PlacedId[]>
  /** Where these ghosts would settle among the canvas, worked out without moving anything. */
  plan: (ids: readonly string[]) => Promise<Map<string, Point>>
}
