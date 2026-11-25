import { describe, expect, it } from 'vitest'
import { soughtLetters } from './letters'
import { defaultGroupKey, groupMatches } from './matches'
import { addSought, connect, startPattern } from './pattern'

// Two players and the club both play for: a ─ c ─ b.
function twoPlayersOneClub() {
  const start = startPattern([])
  const a = start.nodes[0].key
  const [one, b] = addSought(start)
  const [two, c] = addSought(one)
  return { pattern: connect(connect(two, a, c), b, c), a, b, c }
}

describe('matches', () => {
  it('letters the sought nodes in drawing order, only when there are several', () => {
    const { pattern, a, b, c } = twoPlayersOneClub()
    const letters = soughtLetters(pattern)
    expect([letters.get(a), letters.get(b), letters.get(c)]).toEqual(['A', 'B', 'C'])
    expect(soughtLetters(startPattern([])).size).toBe(0)
  })

  it('gathers matches round the node linking the others when its entities repeat', () => {
    const { pattern, a, b, c } = twoPlayersOneClub()
    const matches = [
      { [a]: 'mrozek', [b]: 'dalmau', [c]: 'lech' },
      { [a]: 'zapolnik', [b]: 'hilbrycht', [c]: 'legia' },
      { [a]: 'mrozek', [b]: 'rajovic', [c]: 'lech' },
    ]
    expect(defaultGroupKey(pattern, matches)).toBe(c)
    expect(groupMatches(matches, c).map((g) => [g.id, g.matches.length])).toEqual([
      ['lech', 2],
      ['legia', 1],
    ])
  })

  it('leaves matches ungrouped when no entity repeats', () => {
    const { pattern, a, b, c } = twoPlayersOneClub()
    const matches = [{ [a]: 'mrozek', [b]: 'dalmau', [c]: 'lech' }]
    expect(defaultGroupKey(pattern, matches)).toBeNull()
    expect(groupMatches(matches, null)).toEqual([{ id: null, matches }])
  })
})
