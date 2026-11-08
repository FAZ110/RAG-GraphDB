// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { RevisionConflict, fetchAnalysis, saveCanvas } from './analyses'

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

afterEach(() => vi.unstubAllGlobals())

const changes = { revision: 3, place: [], remove: [], cite: [], uncite: [] }

it('turns 409 into a RevisionConflict, so the editor reloads instead of failing', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(409, { detail: 'Analiza zmieniła się' })))
  const saving = saveCanvas('s1', 'a1', changes)
  await expect(saving).rejects.toBeInstanceOf(RevisionConflict)
  await expect(saving).rejects.toThrow('Analiza zmieniła się')
})

it('turns other errors into a plain Error', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(500, { detail: 'Neo4j error' })))
  const saving = saveCanvas('s1', 'a1', changes)
  await expect(saving).rejects.toThrow('Neo4j error')
  await expect(saving).rejects.not.toBeInstanceOf(RevisionConflict)
})

it('sends the canvas changes as a PATCH', async () => {
  const fetch = vi.fn().mockResolvedValue(json(200, { revision: 4, updated_at: 'x' }))
  vi.stubGlobal('fetch', fetch)
  expect(await saveCanvas('s1', 'a/1', changes)).toEqual({ revision: 4, updated_at: 'x' })
  const [url, init] = fetch.mock.calls[0]
  expect(url).toBe('/api/spaces/s1/analyses/a%2F1/canvas')
  expect(init.method).toBe('PATCH')
  expect(JSON.parse(init.body)).toEqual(changes)
})

it('sends no Content-Type without a body', async () => {
  const fetch = vi.fn().mockResolvedValue(json(200, {}))
  vi.stubGlobal('fetch', fetch)
  await fetchAnalysis('s1', 'a1')
  expect(fetch.mock.calls[0][1].headers).toBeUndefined()
})
