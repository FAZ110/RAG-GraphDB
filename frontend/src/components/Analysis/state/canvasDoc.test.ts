import { describe, expect, it } from 'vitest'
import type { LoadedNode } from '@/types'
import {
  addition,
  changed,
  lastLabel,
  loadedDoc,
  movement,
  pending,
  redone,
  refreshed,
  removal,
  saved,
  settled,
  undone,
} from './canvasDoc'

const node = (id: string, degree = 1): LoadedNode => ({
  id,
  label: 'OSOBA',
  name: `Osoba ${id}`,
  degree,
  properties: {},
})

const empty = () => loadedDoc([])
const withA = () => changed(empty(), addition([node('a')], [{ x: 1, y: 2 }]), 'Dodano A')
const position = (doc: ReturnType<typeof empty>, id: string) => {
  const p = doc.entities.get(id)
  return p && { x: p.x, y: p.y }
}

describe('loading', () => {
  it('starts with the saved entities and nothing to save', () => {
    const doc = loadedDoc([{ ...node('a'), x: 5, y: 6 }])
    expect(position(doc, 'a')).toEqual({ x: 5, y: 6 })
    expect(doc.dirty.size).toBe(0)
    expect(pending(doc)).toEqual({ place: [], remove: [] })
  })
})

describe('changes and history', () => {
  it('applies a change and marks it to save', () => {
    const doc = withA()
    expect(position(doc, 'a')).toEqual({ x: 1, y: 2 })
    expect(pending(doc)).toEqual({ place: [{ id: 'a', x: 1, y: 2 }], remove: [] })
    expect(lastLabel(doc)).toBe('Dodano A')
  })

  it('ignores an empty change', () => {
    const doc = empty()
    expect(changed(doc, new Map(), 'nic')).toBe(doc)
  })

  it('undo takes the change back and redo puts it again', () => {
    const doc = changed(withA(), movement(withA(), [{ id: 'a', x: 9, y: 9 }]), 'Przesunięto')
    const back = undone(doc)
    expect(position(back, 'a')).toEqual({ x: 1, y: 2 })
    expect(lastLabel(back)).toBe('Dodano A')
    expect(position(redone(back), 'a')).toEqual({ x: 9, y: 9 })
  })

  it('undoing an addition takes the entity off the canvas and saves that', () => {
    const back = undone(withA())
    expect(back.entities.has('a')).toBe(false)
    expect(pending(back)).toEqual({ place: [], remove: ['a'] })
  })

  it('a new change clears what could be redone', () => {
    const back = undone(withA())
    const next = changed(back, addition([node('b')], [{ x: 0, y: 0 }]), 'Dodano B')
    expect(redone(next)).toBe(next)
  })

  it('undo and redo with no history change nothing', () => {
    const doc = empty()
    expect(undone(doc)).toBe(doc)
    expect(redone(doc)).toBe(doc)
  })

  it('keeps at most 100 steps of history', () => {
    let doc = withA()
    for (let i = 0; i < 150; i++)
      doc = changed(doc, movement(doc, [{ id: 'a', x: i, y: i }]), `${i}`)
    expect(doc.past).toHaveLength(100)
  })

  it('removal takes entities off and moving a missing entity does nothing', () => {
    const doc = changed(withA(), removal(['a']), 'Usunięto')
    expect(doc.entities.size).toBe(0)
    expect(movement(doc, [{ id: 'a', x: 1, y: 1 }]).size).toBe(0)
  })
})

describe('saving', () => {
  it('forgets what a save sent', () => {
    const doc = withA()
    expect(saved(doc, new Map(doc.dirty)).dirty.size).toBe(0)
  })

  it('keeps a change made while the save was on its way', () => {
    const doc = withA()
    const sent = new Map(doc.dirty)
    const meanwhile = changed(doc, movement(doc, [{ id: 'a', x: 7, y: 7 }]), 'Przesunięto')
    const after = saved(meanwhile, sent)
    expect(pending(after)).toEqual({ place: [{ id: 'a', x: 7, y: 7 }], remove: [] })
  })

  it('fresher node data is neither saved nor undoable', () => {
    const doc = saved(withA(), new Map(withA().dirty))
    const fresh = refreshed(doc, [node('a', 5)])
    expect(fresh.entities.get('a')!.node.degree).toBe(5)
    expect(fresh.dirty.size).toBe(0)
    expect(fresh.past).toBe(doc.past)
    expect(refreshed(fresh, [node('a', 5)])).toBe(fresh)
  })
})

describe('settled layout', () => {
  it('folds where entities settled into the change that added them', () => {
    const doc = settled(withA(), [{ id: 'a', x: 50, y: 60 }])
    expect(position(doc, 'a')).toEqual({ x: 50, y: 60 })
    expect(doc.past).toHaveLength(1)
    // Redo after undo puts the entity where it settled, not where it was first dropped.
    expect(position(redone(undone(doc)), 'a')).toEqual({ x: 50, y: 60 })
    expect(pending(doc).place).toEqual([{ id: 'a', x: 50, y: 60 }])
  })
})
