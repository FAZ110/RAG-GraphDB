import { describe, expect, it } from 'vitest'
import { tokenize } from './cypher'

const kinds = (text: string) =>
  tokenize(text)
    .filter((t) => t.kind !== 'plain')
    .map((t) => `${t.kind}:${t.text}`)

describe('tokenize', () => {
  it('gives back the text it was given', () => {
    const text = 'MATCH (k:Entity {space_id: $space_id}) WHERE k.id IN $k_ids\nRETURN k LIMIT 5'
    expect(
      tokenize(text)
        .map((t) => t.text)
        .join('')
    ).toBe(text)
  })

  it('tells keywords, labels, types, parameters, functions and literals apart', () => {
    expect(
      kinds("OPTIONAL MATCH (a)-[:`GRA_W`]->(b:Entity) WHERE toLower(a.name) = 'x' LIMIT 3")
    ).toEqual([
      'keyword:OPTIONAL',
      'keyword:MATCH',
      'label::`GRA_W`',
      'label::Entity',
      'keyword:WHERE',
      'function:toLower',
      "string:'x'",
      'keyword:LIMIT',
      'number:3',
    ])
    expect(kinds('size([kid IN $g_ids WHERE EXISTS { MATCH (x) }]) >= $g_at_least')).toEqual([
      'function:size',
      'keyword:IN',
      'param:$g_ids',
      'keyword:WHERE',
      'keyword:EXISTS',
      'keyword:MATCH',
      'param:$g_at_least',
    ])
  })

  it('does not take a map key for a label', () => {
    expect(kinds('{space_id: $space_id}')).toEqual(['param:$space_id'])
    expect(kinds('RETURN {o: o.id} AS match')).toEqual([
      'keyword:RETURN',
      'keyword:AS',
      'keyword:match',
    ])
  })
})
