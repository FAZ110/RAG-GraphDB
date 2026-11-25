import { describe as group, expect, it } from 'vitest'
import type { LoadedNode } from '@/types'
import type { Statement } from './describe'
import { describe, sentences } from './describe'
import type { Pattern, PatternEdge } from './pattern'
import { connect, startPattern, updateEdge, updateNode } from './pattern'

const entity = (id: string, label: string): LoadedNode => ({
  id,
  label,
  name: id,
  degree: 1,
  properties: {},
})

/** Statements as plain text, nodes by key, the way the sentences read. */
const read = (said: Statement[]) =>
  said.map((s) =>
    s.kind === 'trait'
      ? `${s.subject.key} ${s.traits.join(' i ') || 'bez warunków'}`
      : [
          s.subjects.map((n) => n.key).join('+'),
          s.phrase,
          s.objects.map((n) => n.key).join('+'),
          s.far,
        ]
          .filter(Boolean)
          .join(' ')
  )

const typed = (p: Pattern, change: Partial<PatternEdge>) =>
  p.edges.reduce((acc, e) => updateEdge(acc, e.key, change), p)

group('describe', () => {
  it('groups the links a sought node makes and adds its traits', () => {
    let p = startPattern([entity('Barcelona', 'KLUB'), entity('Lech', 'KLUB')])
    p = connect(connect(p, 'x1', 'k1'), 'x1', 'k2')
    p = typed(p, { type: 'GRA_W', direction: 'out' })
    p = updateNode(p, 'x1', {
      label: 'ZAWODNIK',
      linkCount: { min: 2, type: 'GRA_W', label: 'KLUB' },
      nameContains: 'Robert',
    })
    expect(read(describe(p))).toEqual([
      'x1 gra w k1+k2',
      'x1 ma co najmniej 2 powiązania „gra w” z encjami typu Klub i ma w nazwie „Robert”',
    ])
  })

  it('tells a link the other one makes from its side', () => {
    let p = connect(startPattern([entity('Lewandowski', 'ZAWODNIK')]), 'k1', 'x1')
    p = typed(p, { type: 'STRZELIŁ_GOL_W', direction: 'out' })
    expect(read(describe(p))).toEqual(['k1 strzelił gol w x1'])
  })

  it('keeps links apart when they differ in relationship or length', () => {
    let p = startPattern([entity('A', 'KLUB'), entity('B', 'KLUB')])
    p = connect(connect(p, 'x1', 'k1'), 'x1', 'k2')
    p = updateEdge(p, p.edges[1].key, { maxHops: 3 })
    expect(read(describe(p))).toEqual(['x1 łączy się z k1', 'x1 łączy się z k2 (do 3 kroków)'])
  })

  it('tells a link between two sought nodes once', () => {
    let p = startPattern([])
    p = { ...p, nodes: [...p.nodes, { ...p.nodes[0], key: 'x2' }] }
    p = connect(p, 'x1', 'x2')
    expect(read(describe(p))).toEqual(['x1 łączy się z x2', 'x2 bez warunków'])
  })

  it('tells links that must not exist, may exist, or go through articles', () => {
    let p = startPattern([entity('Legia', 'KLUB'), entity('Lech', 'KLUB')])
    p = connect(connect(p, 'x1', 'k1'), 'x1', 'k2')
    p = updateEdge(p, p.edges[0].key, { type: 'GRA_W', direction: 'out', mode: 'not' })
    p = updateEdge(p, p.edges[1].key, { via: 'articles' })
    expect(read(describe(p))).toEqual(['x1 nie gra w k1', 'x1 występuje w artykułach razem z k2'])
    p = updateEdge(p, p.edges[1].key, { via: 'relation', mode: 'optional' })
    expect(read(describe(p))[1]).toBe('x1 łączy się z k2 (jeśli jest)')
  })

  it('tells one sentence per sought node, what it must not do last', () => {
    let p = startPattern([entity('Lech', 'KLUB'), entity('Barcelona', 'KLUB')])
    p = connect(connect(p, 'x1', 'k1'), 'x1', 'k2')
    p = updateEdge(p, p.edges[0].key, { type: 'GRAL_DLA', direction: 'out', mode: 'not' })
    p = updateEdge(p, p.edges[1].key, { type: 'GRA_W', direction: 'out' })
    p = updateNode(p, 'x1', { linkCount: { min: 2, type: null, label: null } })
    const said = sentences(describe(p))
    expect(said).toHaveLength(1)
    expect(said[0].map((s) => s.kind === 'link' && s.mode)).toEqual(['required', false, 'not'])
  })
})
