import { describe, expect, it } from 'vitest'
import { tiesOf } from './links'

const known = new Map([
  ['ishak', { id: 'ishak', name: 'Mikael Ishak', label: 'ZAWODNIK' }],
  ['lech', { id: 'lech', name: 'Lech Poznań', label: 'KLUB' }],
  ['szachtar', { id: 'szachtar', name: 'Szachtar Donieck', label: 'KLUB' }],
])
const edge = (id: string, source: string, type: string, target: string) => ({
  id,
  source,
  type,
  target,
})

describe('tiesOf', () => {
  it('draws each entity once with every relationship between them, by its way', () => {
    const ties = tiesOf(
      'ishak',
      [
        edge('1', 'lech', 'GRA_W', 'ishak'),
        edge('2', 'ishak', 'GRA_W', 'lech'),
        edge('3', 'ishak', 'GRA_W', 'lech'),
        edge('4', 'ishak', 'STRZELIL_GOL_W', 'szachtar'),
      ],
      known
    )
    expect(ties.map((t) => [t.other.name, t.rels.map((r) => `${r.type}:${r.out}`)])).toEqual([
      ['Lech Poznań', ['GRA_W:false', 'GRA_W:true']],
      ['Szachtar Donieck', ['STRZELIL_GOL_W:true']],
    ])
  })
})
