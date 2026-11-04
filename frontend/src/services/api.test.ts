// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AUTH_EXPIRED, createNode, deleteNode, readError, spaceUrl } from './api'

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

afterEach(() => vi.unstubAllGlobals())

describe('readError', () => {
  it('returns the detail the backend sent', async () => {
    expect(await readError(json(404, { detail: 'Space not found' }))).toBe('Space not found')
  })

  it('returns the first message of a validation error list', async () => {
    const body = { detail: [{ msg: 'Podaj poprawny adres e-mail' }, { msg: 'drugi' }] }
    expect(await readError(json(422, body))).toBe('Podaj poprawny adres e-mail')
  })

  it('falls back to the status when the body is not JSON', async () => {
    expect(await readError(new Response('<html>Bad gateway</html>', { status: 502 }))).toBe(
      'Server error: 502'
    )
  })

  it('announces an expired session on 401 only', async () => {
    const expired = vi.fn()
    window.addEventListener(AUTH_EXPIRED, expired)
    await readError(json(403, { detail: 'x' }))
    expect(expired).not.toHaveBeenCalled()
    await readError(json(401, { detail: 'Zaloguj się' }))
    expect(expired).toHaveBeenCalledOnce()
    window.removeEventListener(AUTH_EXPIRED, expired)
  })
})

it('encodes the space id into the URL', () => {
  expect(spaceUrl('a/b?c')).toBe('/api/spaces/a%2Fb%3Fc')
})

describe('JSON requests', () => {
  it('sends the body as JSON and returns the response', async () => {
    const fetch = vi.fn().mockResolvedValue(json(201, { id: 'n1' }))
    vi.stubGlobal('fetch', fetch)

    const node = await createNode('s1', { name: 'Jan', label: 'OSOBA' })

    expect(node).toEqual({ id: 'n1' })
    const [url, init] = fetch.mock.calls[0]
    expect(url).toBe('/api/spaces/s1/graph/nodes')
    expect(init.method).toBe('POST')
    expect(init.headers).toEqual({ 'Content-Type': 'application/json' })
    expect(JSON.parse(init.body)).toEqual({ name: 'Jan', label: 'OSOBA' })
  })

  it('resolves to undefined on 204 without reading a body', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 204 })))
    await expect(deleteNode('s1', 'n1')).resolves.toBeUndefined()
  })

  it("throws the backend's message on an error", async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(409, { detail: 'Taka encja już jest' })))
    await expect(createNode('s1', { name: 'Jan', label: 'OSOBA' })).rejects.toThrow(
      'Taka encja już jest'
    )
  })
})
