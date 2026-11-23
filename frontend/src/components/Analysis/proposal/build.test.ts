import { describe, expect, it } from 'vitest'
import type { LoadedEdge, LoadedNode } from '@/types'
import type { Placed } from '../state/canvasDoc'
import { expandProposal, mentionsProposal, pathProposal, typeProposal } from './build'
import type { Context } from './build'
import { candidates, relationGroupKey, visible } from './proposal'

const node = (id: string, label = 'OSOBA', degree = 1): LoadedNode => ({
  id,
  label,
  name: id,
  degree,
  properties: {},
})
const edge = (source: string, target: string, type: string): LoadedEdge => ({
  id: `${source}-${type}-${target}`,
  source,
  target,
  type,
})
const placed = (n: LoadedNode, x = 0, y = 0): Placed => ({ node: n, x, y })

const root = placed(node('Jan'))
const ctx = (...on: Placed[]): Context => ({
  onCanvas: new Map(on.map((p) => [p.node.id, p])),
  viewCenter: { x: 0, y: 0 },
})

describe('expandProposal', () => {
  const res = {
    root: root.node,
    nodes: [node('Jan'), node('Anna'), node('Ewa'), node('Inter', 'KLUB')],
    edges: [
      edge('Jan', 'Anna', 'ZNA'),
      edge('Jan', 'Ewa', 'ZNA'),
      edge('Inter', 'Jan', 'ZATRUDNIA'),
    ],
  }

  it('proposes neighbours not on the canvas, each with a spot', () => {
    const p = expandProposal(root, res, ctx(root, placed(node('Ewa'), 50, 50)))
    expect(p.nodes.map((n) => n.id)).toEqual(['Anna', 'Inter'])
    expect([...p.spots.keys()]).toEqual(['Anna', 'Inter'])
  })

  it('groups candidates by relation and direction, biggest first', () => {
    const p = expandProposal(root, res, ctx(root))
    expect(p.groups!.map((g) => [g.key, g.count])).toEqual([
      [relationGroupKey(false, 'ZNA', 'OSOBA'), 2],
      [relationGroupKey(true, 'ZATRUDNIA', 'KLUB'), 1],
    ])
  })

  it('a group narrows the candidates, and paging limits what shows', () => {
    const proposal = expandProposal(root, res, ctx(root))
    const view = { proposal, group: relationGroupKey(false, 'ZNA', 'OSOBA'), shown: 1 }
    expect(candidates(view).map((n) => n.id)).toEqual(['Anna', 'Ewa'])
    expect(visible(view).map((n) => n.id)).toEqual(['Anna'])
  })
})

describe('pathProposal', () => {
  const from = placed(node('Jan'))
  const to = placed(node('Inter'), 300, 0)

  it('places the entities between the ends and names the steps', () => {
    const res = {
      nodes: [node('Jan'), node('Anna'), node('Inter')],
      paths: [
        {
          node_ids: ['Jan', 'Anna', 'Inter'],
          edges: [edge('Jan', 'Anna', 'ZNA'), edge('Anna', 'Inter', 'GRA_W')],
        },
      ],
    }
    const p = pathProposal(from, to, res, ctx(from, to))
    expect(p.nodes.map((n) => n.id)).toEqual(['Anna'])
    expect(p.title).toBe('Jan → Inter, 2 kroki')
    expect(p.route!.has('Jan-ZNA-Anna')).toBe(true)
  })

  it('gives each path its own group and route, named by the way it goes', () => {
    const res = {
      nodes: [node('Jan'), node('Anna'), node('Ewa'), node('Inter')],
      paths: [
        { node_ids: ['Jan', 'Inter'], edges: [edge('Jan', 'Inter', 'GRA_W')] },
        {
          node_ids: ['Jan', 'Anna', 'Inter'],
          edges: [edge('Jan', 'Anna', 'ZNA'), edge('Anna', 'Inter', 'GRA_W')],
        },
        {
          node_ids: ['Jan', 'Ewa', 'Inter'],
          edges: [edge('Jan', 'Ewa', 'ZNA'), edge('Ewa', 'Inter', 'GRA_W')],
        },
      ],
    }
    const p = pathProposal(from, to, res, ctx(from, to))
    expect(p.groups!.map((g) => g.name)).toEqual([
      'bezpośrednio (1 krok)',
      'przez Anna (2 kroki)',
      'przez Ewa (2 kroki)',
    ])
    const second = p.groups![1].key
    expect([...p.routes!.get(second)!]).toEqual([
      'Jan',
      'Anna',
      'Inter',
      'Jan-ZNA-Anna',
      'Anna-GRA_W-Inter',
    ])
    expect(candidates({ proposal: p, group: second, shown: 12 }).map((n) => n.id)).toEqual(['Anna'])
  })

  it('says when there is no path', () => {
    const p = pathProposal(from, to, { nodes: [], paths: [] }, ctx(from, to))
    expect(p.nodes).toEqual([])
    expect(p.empty).toBe('Te encje nie są ze sobą połączone')
  })
})

it('typeProposal leaves out what is on the canvas already', () => {
  const anna = placed(node('Anna'))
  const p = typeProposal('OSOBA', [node('Anna'), node('Ewa')], ctx(anna))
  expect(p.nodes.map((n) => n.id)).toEqual(['Ewa'])
  expect(p.spots.has('Ewa')).toBe(true)
})

describe('mentionsProposal', () => {
  const found = [node('Anna'), node('Inter', 'KLUB')]

  it('proposes what is written about with the entity, most often first, without edges', () => {
    const p = mentionsProposal(root, found, ctx(root))
    expect(p.nodes.map((n) => n.id)).toEqual(['Anna', 'Inter'])
    expect([...p.spots.keys()]).toEqual(['Anna', 'Inter'])
    expect(p.edges).toEqual([])
  })

  it('says whether nothing was found or all of it is on the canvas already', () => {
    const all = ctx(root, placed(node('Anna')), placed(node('Inter', 'KLUB')))
    expect(mentionsProposal(root, found, all).nodes).toEqual([])
    expect(mentionsProposal(root, found, all).empty).not.toBe(
      mentionsProposal(root, [], ctx(root)).empty
    )
  })
})
