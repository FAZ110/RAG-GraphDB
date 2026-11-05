// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { RevisionConflict, createAnalysis, saveCanvas } from '@/services/analyses'
import type { LoadedNode } from '@/types'
import { addition, changed, loadedDoc, movement, saved } from './canvasDoc'
import type { CanvasDoc } from './canvasDoc'
import { useAutosave } from './useAutosave'

vi.mock('@/services/analyses', async (actual) => ({
  ...(await actual<typeof import('@/services/analyses')>()),
  createAnalysis: vi.fn(),
  saveCanvas: vi.fn(),
}))

const create = vi.mocked(createAnalysis)
const save = vi.mocked(saveCanvas)

const node: LoadedNode = { id: 'a', label: 'OSOBA', name: 'Jan', degree: 1, properties: {} }
const withEntity = (doc = loadedDoc([])) => changed(doc, addition([node], [{ x: 1, y: 2 }]), 'add')
const existing = { id: 'an1', revision: 3, savedAt: '2026-11-04T10:00:00Z' }

function setup(analysis: typeof existing | null, doc: CanvasDoc) {
  const onSaved = vi.fn()
  const onCreated = vi.fn()
  const hook = renderHook(
    ({ doc }) =>
      useAutosave({ spaceId: 's1', analysis, doc, name: 'Śledztwo', onSaved, onCreated }),
    { initialProps: { doc } }
  )
  return { ...hook, onSaved, onCreated }
}

// Let the save's promise settle inside React's act.
const flush = () => act(async () => {})

beforeEach(() => {
  vi.useFakeTimers()
  create.mockReset()
  save.mockReset()
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('a new analysis', () => {
  it('stays a draft and saves nothing while the canvas is empty', async () => {
    const { result } = setup(null, loadedDoc([]))
    await act(() => vi.advanceTimersByTimeAsync(5000))
    expect(result.current.status).toBe('draft')
    expect(create).not.toHaveBeenCalled()
  })

  it('is created right away with its first entity', async () => {
    create.mockResolvedValue({ id: 'new1', revision: 1, updated_at: 'u' } as never)
    const doc = withEntity()
    const { result, onCreated, onSaved } = setup(null, doc)
    await act(() => vi.advanceTimersByTimeAsync(0))
    await flush()

    expect(create).toHaveBeenCalledWith('s1', {
      name: 'Śledztwo',
      entities: [{ id: 'a', x: 1, y: 2 }],
      article_ids: [],
    })
    expect(onCreated).toHaveBeenCalledWith(expect.objectContaining({ id: 'new1' }))
    expect(onSaved).toHaveBeenCalledWith(new Map(doc.dirty))
    expect(result.current.id).toBe('new1')
  })
})

describe('a saved analysis', () => {
  it('waits for changes to settle, then saves them at its revision', async () => {
    save.mockResolvedValue({ revision: 4, updated_at: 'u' })
    const { result, rerender } = setup(existing, loadedDoc([]))
    expect(result.current.status).toBe('saved')

    const doc = withEntity()
    rerender({ doc })
    expect(result.current.status).toBe('unsaved')
    await act(() => vi.advanceTimersByTimeAsync(799))
    expect(save).not.toHaveBeenCalled()

    await act(() => vi.advanceTimersByTimeAsync(1))
    await flush()
    expect(save).toHaveBeenCalledWith('s1', 'an1', {
      revision: 3,
      place: [{ id: 'a', x: 1, y: 2 }],
      remove: [],
    })

    // The next save goes out at the revision the server returned.
    const next = changed(
      saved(doc, new Map(doc.dirty)),
      movement(doc, [{ id: 'a', x: 5, y: 5 }]),
      'move'
    )
    rerender({ doc: next })
    await act(() => vi.advanceTimersByTimeAsync(800))
    await flush()
    expect(save).toHaveBeenLastCalledWith('s1', 'an1', expect.objectContaining({ revision: 4 }))
  })

  it('a burst of changes goes out as one save', async () => {
    save.mockResolvedValue({ revision: 4, updated_at: 'u' })
    const { rerender } = setup(existing, loadedDoc([]))
    let doc = withEntity()
    for (let i = 0; i < 5; i++) {
      doc = changed(doc, movement(doc, [{ id: 'a', x: i, y: i }]), 'move')
      rerender({ doc })
      await act(() => vi.advanceTimersByTimeAsync(300))
    }
    await act(() => vi.advanceTimersByTimeAsync(800))
    await flush()
    expect(save).toHaveBeenCalledOnce()
  })

  it('stops saving on a conflict with another tab', async () => {
    save.mockRejectedValue(new RevisionConflict('Analiza zmieniła się w innym miejscu'))
    const { result, rerender } = setup(existing, loadedDoc([]))
    rerender({ doc: withEntity() })
    await act(() => vi.advanceTimersByTimeAsync(800))
    await flush()
    expect(result.current.status).toBe('conflict')

    act(() => result.current.retry())
    await act(() => vi.advanceTimersByTimeAsync(800))
    await flush()
    expect(save).toHaveBeenCalledOnce()
  })

  it('reports an error and saves again on retry', async () => {
    save.mockRejectedValueOnce(new Error('Neo4j unavailable'))
    save.mockResolvedValue({ revision: 4, updated_at: 'u' })
    const { result, rerender } = setup(existing, loadedDoc([]))
    rerender({ doc: withEntity() })
    await act(() => vi.advanceTimersByTimeAsync(800))
    await flush()
    expect(result.current.status).toBe('error')
    expect(result.current.error).toBe('Neo4j unavailable')

    act(() => result.current.retry())
    await act(() => vi.advanceTimersByTimeAsync(800))
    await flush()
    expect(save).toHaveBeenCalledTimes(2)
    expect(result.current.error).toBeNull()
  })

  it('warns before leaving the page with unsaved changes', async () => {
    save.mockReturnValue(new Promise(() => {}))
    const { rerender } = setup(existing, loadedDoc([]))
    const clean = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(clean)
    expect(clean.defaultPrevented).toBe(false)

    rerender({ doc: withEntity() })
    const dirty = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(dirty)
    expect(dirty.defaultPrevented).toBe(true)
  })
})
