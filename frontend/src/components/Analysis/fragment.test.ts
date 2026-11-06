import { expect, it } from 'vitest'
import type { LoadedEdge, LoadedNode } from '@/types'
import { fragmentHub, fragmentSpots } from './fragment'

const node = (id: string, degree = 0): LoadedNode => ({
  id,
  label: 'Person',
  name: `name-${id}`,
  degree,
  properties: {},
})
const edge = (source: string, target: string): LoadedEdge => ({
  id: `${source}-${target}`,
  source,
  target,
  type: 'KNOWS',
})

it('centres the fragment on the canvas and flips the map y, which grows upwards', () => {
  const spots = fragmentSpots([
    { id: 'a', x: 10, y: 10 },
    { id: 'b', x: 20, y: 20 },
  ])
  const a = spots.get('a')!
  const b = spots.get('b')!
  expect(a.x + b.x).toBeCloseTo(0)
  expect(a.y + b.y).toBeCloseTo(0)
  expect(b.x).toBeGreaterThan(a.x)
  expect(b.y).toBeLessThan(a.y)
})

it('keeps the shape whatever the map scale, spreading by how many entities there are', () => {
  const small = fragmentSpots([
    { id: 'a', x: 0, y: 0 },
    { id: 'b', x: 1, y: 0 },
  ])
  const big = fragmentSpots([
    { id: 'a', x: 0, y: 0 },
    { id: 'b', x: 1000, y: 0 },
  ])
  expect(big).toEqual(small)
  expect(small.get('b')!.x - small.get('a')!.x).toBeCloseTo(Math.sqrt(2) * 110)
})

it('places a single entity, or ones stacked on one spot, without dividing by zero', () => {
  const single = fragmentSpots([{ id: 'a', x: 5, y: 5 }]).get('a')!
  expect(single.x).toBeCloseTo(0)
  expect(single.y).toBeCloseTo(0)
  const stacked = fragmentSpots([
    { id: 'a', x: 3, y: 3 },
    { id: 'b', x: 3, y: 3 },
  ])
  expect([...stacked.values()].every((p) => Number.isFinite(p.x) && Number.isFinite(p.y))).toBe(
    true
  )
})

it('names the fragment after the entity most linked within it, not in the whole graph', () => {
  const nodes = [node('a', 100), node('b', 1), node('c', 1)]
  expect(fragmentHub(nodes, [edge('b', 'c'), edge('b', 'a')]).id).toBe('b')
})

it('breaks a tie with the degree in the whole graph', () => {
  const nodes = [node('a', 2), node('b', 9)]
  expect(fragmentHub(nodes, [edge('a', 'b')]).id).toBe('b')
})

it('falls back to the biggest hub when the fragment has no links', () => {
  expect(fragmentHub([node('a', 1), node('b', 5), node('c', 3)], []).id).toBe('b')
})
