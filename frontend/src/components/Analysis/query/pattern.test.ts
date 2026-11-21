import { describe, expect, it } from 'vitest'
import type { LoadedNode } from '@/types'
import type { SpaceSchema } from '@/types/query'
import {
  addKnown,
  addSought,
  addToGroup,
  connect,
  loose,
  problem,
  removeFromGroup,
  removeNode,
  startPattern,
  toBody,
  updateEdge,
  updateNode,
} from './pattern'
import { relationOptions } from './relations'

const entity = (id: string, label: string): LoadedNode => ({
  id,
  label,
  name: id,
  degree: 1,
  properties: {},
})
const legia = entity('legia', 'KLUB')
const lech = entity('lech', 'KLUB')

describe('pattern', () => {
  it('starts from the selection with one sought node, linked to nothing yet', () => {
    const p = startPattern([legia, lech])
    expect(p.nodes.map((n) => [n.key, n.known?.[0].id ?? null])).toEqual([
      ['k1', 'legia'],
      ['k2', 'lech'],
      ['x1', null],
    ])
    expect(p.edges).toEqual([])
    expect(problem(p)).toMatch(/Połącz/)
  })

  it('can be asked once every node is linked', () => {
    let p = startPattern([legia, lech])
    p = connect(connect(p, 'k1', 'x1'), 'x1', 'k2')
    expect(loose(p)).toEqual([])
    expect(problem(p)).toBeNull()
  })

  it('names the nodes left out of the biggest linked group', () => {
    const p = connect(startPattern([legia, lech]), 'k1', 'x1')
    expect(loose(p).map((n) => n.key)).toEqual(['k2'])
  })

  it('links two nodes once, and never a node to itself', () => {
    const p = startPattern([legia])
    const once = connect(p, 'k1', 'x1')
    expect(connect(once, 'x1', 'k1').edges).toHaveLength(1)
    expect(connect(p, 'x1', 'x1').edges).toHaveLength(0)
  })

  it('asks for a sought node when only known ones are left', () => {
    const p = removeNode(startPattern([legia]), 'x1')
    expect(problem(p)).toMatch(/szukasz/)
  })

  it('removes a node with its links only', () => {
    const [grown] = addSought(connect(startPattern([legia]), 'k1', 'x1'))
    const p = removeNode(grown, 'x1')
    expect(p.nodes.map((n) => n.key)).toEqual(['k1', 'x2'])
    expect(p.edges).toEqual([])
  })

  it('adds an entity once, in a place not taken', () => {
    const [p, key] = addKnown(startPattern([legia]), lech)
    expect(key).toBe('k2')
    expect(addKnown(p, lech)[1]).toBeNull()
    const [a, b] = [p.nodes[0], p.nodes.at(-1)!]
    expect(Math.abs(a.x - b.x) > 0.2 || Math.abs(a.y - b.y) > 0.13).toBe(true)
  })

  it('sends known nodes as ids and sought ones with their conditions', () => {
    const p = startPattern([legia])
    p.nodes[1] = {
      ...p.nodes[1],
      label: 'OSOBA',
      linkCount: { min: 3, type: 'GRA_W', label: null },
      nameContains: ' Jan ',
    }
    expect(toBody(p).nodes).toEqual([
      { key: 'k1', ids: ['legia'] },
      {
        key: 'x1',
        label: 'OSOBA',
        link_count: { min: 3, type: 'GRA_W' },
        name_contains: 'Jan',
      },
    ])
  })
})

describe('relationOptions', () => {
  const schema: SpaceSchema = {
    labels: [],
    relations: [
      { source: 'OSOBA', type: 'GRA_W', target: 'KLUB', count: 40 },
      { source: 'OSOBA', type: 'ZNA', target: 'OSOBA', count: 5 },
      { source: 'KLUB', type: 'RYWAL', target: 'KLUB', count: 2 },
    ],
  }

  it('reads the direction from the link source', () => {
    const example = { source: 'OSOBA', target: 'KLUB' }
    expect(relationOptions(schema, 'KLUB', 'OSOBA')).toEqual([
      { type: 'GRA_W', direction: 'in', count: 40, example },
    ])
    expect(relationOptions(schema, 'OSOBA', 'KLUB')).toEqual([
      { type: 'GRA_W', direction: 'out', count: 40, example },
    ])
  })

  it('takes the way most links run, not a few stored backwards', () => {
    const noisy: SpaceSchema = {
      labels: [],
      relations: [
        { source: 'OSOBA', type: 'GRA_W', target: 'KLUB', count: 40 },
        { source: 'KLUB', type: 'GRA_W', target: 'OSOBA', count: 3 },
      ],
    }
    expect(relationOptions(noisy, 'KLUB', null)[0].direction).toBe('in')
  })

  it('lets links within one type run either way, counted once', () => {
    expect(relationOptions(schema, 'OSOBA', 'OSOBA')).toEqual([
      { type: 'ZNA', direction: 'any', count: 5, example: { source: 'OSOBA', target: 'OSOBA' } },
    ])
  })

  it('offers everything from a type when the other end is any type', () => {
    expect(relationOptions(schema, 'KLUB', null).map((o) => o.type)).toEqual(['GRA_W', 'RYWAL'])
  })
})

describe('richer questions', () => {
  const base = () => connect(startPattern([legia]), 'x1', 'k1')

  it('asks an optional link only towards a sought node with no other link', () => {
    let p = addSought(base())[0]
    p = connect(p, 'x1', 'x2')
    p = updateEdge(p, p.edges[1].key, { mode: 'optional' })
    expect(problem(p)).toBeNull()
    p = updateEdge(p, p.edges[0].key, { mode: 'optional' })
    expect(problem(p)).toMatch(/Opcjonalne/)
  })

  it('keeps a must-not-exist link to a known node out of the drawing that must hang together', () => {
    let p = connect(startPattern([legia, lech]), 'x1', 'k1')
    p = connect(p, 'x1', 'k2')
    p = updateEdge(p, p.edges[1].key, { mode: 'not' })
    expect(problem(p)).toBeNull()
    expect(loose(p)).toEqual([])
  })

  it('sends the new options in the request', () => {
    let p = connect(startPattern([legia, lech]), 'x1', 'k1')
    p = addToGroup(p, 'k1', entity('wisla', 'KLUB'))
    p = removeNode(p, 'k2')
    p = updateNode(p, 'k1', { atLeast: 2 })
    p = updateEdge(p, p.edges[0].key, { via: 'articles', type: 'GRA_W', maxHops: 3 })
    const body = toBody(p)
    expect(body.nodes[0]).toMatchObject({ ids: ['legia', 'wisla'], at_least: 2 })
    // Through an article there is no relationship or length to send.
    expect(body.edges[0]).toMatchObject({ via: 'articles', mode: 'required', max_hops: 1 })
    expect(body.edges[0].type).toBeUndefined()
  })

  it('drops the group with its last entity and never asks for more than are left', () => {
    let p = connect(startPattern([legia]), 'x1', 'k1')
    p = addToGroup(addToGroup(p, 'k1', lech), 'k1', entity('wisla', 'KLUB'))
    p = updateNode(p, 'k1', { atLeast: 3 })
    p = removeFromGroup(p, 'k1', 'wisla')
    expect(p.nodes.find((n) => n.key === 'k1')!.atLeast).toBeNull()
    p = removeFromGroup(removeFromGroup(p, 'k1', 'lech'), 'k1', 'legia')
    expect(p.nodes.some((n) => n.key === 'k1')).toBe(false)
  })
})
