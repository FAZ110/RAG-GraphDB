import { storedValue } from '@/lib/storedValue'

export type Side = 'left' | 'right'

/** Docked to a side of the canvas, or loose at a spot on it; either way maybe folded to its bar. */
export type Placement = ({ dock: Side } | { x: number; y: number }) & { collapsed?: boolean }

// One record for every window, so windows that come and go keep their place.
const placements = storedValue<Record<string, Placement>>(
  'atlas:windows',
  {},
  { parse: (raw) => JSON.parse(raw), format: (value) => JSON.stringify(value) }
)

export const usePlacements = () => placements.useValue()

export function place(id: string, placement: Placement) {
  placements.set({ ...placements.get(), [id]: placement })
}
