import type { LoadedNode } from '@/types'
import type { CanvasEntity, PlacedId, Point } from '@/types/analysis'

export interface Placed extends Point {
  node: LoadedNode
}

/** What a change leaves each touched entity as; null takes it off the canvas. */
export type Patch = ReadonlyMap<string, Placed | null>

interface Step {
  label: string
  before: Patch
  after: Patch
}

export interface CanvasDoc {
  entities: ReadonlyMap<string, Placed>
  past: readonly Step[]
  future: readonly Step[]
  /** Entities changed since the last save, by the number of the change that last touched them. */
  dirty: ReadonlyMap<string, number>
  seq: number
}

const HISTORY = 100

export function loadedDoc(entities: readonly CanvasEntity[]): CanvasDoc {
  return {
    entities: new Map(entities.map(({ x, y, ...node }) => [node.id, { node, x, y }])),
    past: [],
    future: [],
    dirty: new Map(),
    seq: 0,
  }
}

function applied(doc: CanvasDoc, patch: Patch): CanvasDoc {
  const entities = new Map(doc.entities)
  const dirty = new Map(doc.dirty)
  const seq = doc.seq + 1
  for (const [id, placed] of patch) {
    if (placed) entities.set(id, placed)
    else entities.delete(id)
    dirty.set(id, seq)
  }
  return { ...doc, entities, dirty, seq }
}

/** Apply a change the user made, so it can be undone. */
export function changed(doc: CanvasDoc, after: Patch, label: string): CanvasDoc {
  if (after.size === 0) return doc
  const before = new Map([...after.keys()].map((id) => [id, doc.entities.get(id) ?? null]))
  const step = { label, before, after }
  return { ...applied(doc, after), past: [...doc.past, step].slice(-HISTORY), future: [] }
}

export function undone(doc: CanvasDoc): CanvasDoc {
  const step = doc.past.at(-1)
  if (!step) return doc
  return {
    ...applied(doc, step.before),
    past: doc.past.slice(0, -1),
    future: [step, ...doc.future],
  }
}

export function redone(doc: CanvasDoc): CanvasDoc {
  const step = doc.future[0]
  if (!step) return doc
  return { ...applied(doc, step.after), past: [...doc.past, step], future: doc.future.slice(1) }
}

/** Fresher data for entities on the canvas, e.g. degrees; not a change to save or undo. */
export function refreshed(doc: CanvasDoc, nodes: readonly LoadedNode[]): CanvasDoc {
  const stale = nodes.filter((n) => {
    const placed = doc.entities.get(n.id)
    return placed && (placed.node.degree !== n.degree || placed.node.name !== n.name)
  })
  if (!stale.length) return doc
  const entities = new Map(doc.entities)
  for (const node of stale) entities.set(node.id, { ...entities.get(node.id)!, node })
  return { ...doc, entities }
}

/** Forget the changes a save sent, keeping those made while it was on its way. */
export function saved(doc: CanvasDoc, sent: ReadonlyMap<string, number>): CanvasDoc {
  const dirty = new Map(doc.dirty)
  for (const [id, seq] of sent) if (dirty.get(id) === seq) dirty.delete(id)
  return { ...doc, dirty }
}

export function pending(doc: CanvasDoc): { place: PlacedId[]; remove: string[] } {
  const place: PlacedId[] = []
  const remove: string[] = []
  for (const id of doc.dirty.keys()) {
    const placed = doc.entities.get(id)
    if (placed) place.push({ id, x: placed.x, y: placed.y })
    else remove.push(id)
  }
  return { place, remove }
}

export const lastLabel = (doc: CanvasDoc) => doc.past.at(-1)?.label ?? null

export function addition(nodes: readonly LoadedNode[], spots: readonly Point[]): Patch {
  return new Map(nodes.map((node, i) => [node.id, { node, ...spots[i] }]))
}

export function removal(ids: readonly string[]): Patch {
  return new Map(ids.map((id) => [id, null]))
}

export function movement(doc: CanvasDoc, moves: readonly PlacedId[]): Patch {
  return new Map(
    moves
      .filter((m) => doc.entities.has(m.id))
      .map(({ id, x, y }) => [id, { ...doc.entities.get(id)!, x, y }])
  )
}

/**
 * Where the layout settled entities the last change added, folded into that change: undoing
 * it takes them away, redoing it puts them back where they settled. Saved like any change.
 */
export function settled(doc: CanvasDoc, moves: readonly PlacedId[]): CanvasDoc {
  const patch = movement(doc, moves)
  if (patch.size === 0) return doc
  const step = doc.past.at(-1)
  const next = applied(doc, patch)
  if (!step) return next
  const after = new Map(step.after)
  for (const [id, placed] of patch) if (after.get(id)) after.set(id, placed)
  return { ...next, past: [...doc.past.slice(0, -1), { ...step, after }], future: doc.future }
}
