import { relationName } from '@/components/canvas/relationName'
import type { SpaceSchema } from '@/types/query'
import { Chips } from './Chips'
import { DirectionPicker } from './DirectionPicker'
import { HopsInput } from './HopsInput'
import type { PatternEdge, PatternNode } from './pattern'
import { MAX_HOPS, labelOf } from './pattern'
import { relationOptions } from './relations'
import { Row } from './Row'

const ANY = '*'
const ARTICLES = '@articles'
// The most common choices shown at once; the rest are found by typing.
const CHIPS_SHOWN = 8

interface Props {
  edge: PatternEdge
  source: PatternNode
  target: PatternNode
  schema: SpaceSchema | undefined
  /** Why the link cannot be optional, or must-not-exist, in this question; null when it can. */
  blocked: { optional: string | null; not: string | null }
  onChange: (change: Partial<PatternEdge>) => void
}

/** How two parts of the question are linked: the relationship, its way and its length. */
export function EdgeEditor({ edge, source, target, schema, blocked, onChange }: Props) {
  const found = schema ? relationOptions(schema, labelOf(source), labelOf(target)) : []
  // A relationship set earlier stays choosable even when the types changed since.
  const relations = [
    { value: ANY, label: 'Dowolna' },
    { value: ARTICLES, label: 'Wspomniane razem' },
    ...found.map((o) => ({ value: o.type, label: relationName(o.type), count: o.count })),
    ...(edge.type && !found.some((o) => o.type === edge.type)
      ? [{ value: edge.type, label: relationName(edge.type), count: 0 }]
      : []),
  ]
  return (
    <div className="flex flex-col divide-y divide-line-soft *:py-3 *:first:pt-0 *:last:pb-0">
      <Row label="Warunek">
        <Chips
          label="Warunek połączenia"
          chips={[
            { value: 'required', label: 'Musi istnieć' },
            {
              value: 'optional',
              label: 'Może istnieć',
              blocked: blocked.optional ?? undefined,
            },
            { value: 'not', label: 'Nie może istnieć', blocked: blocked.not ?? undefined },
          ]}
          value={edge.mode}
          onChange={(mode) => onChange({ mode })}
        />
      </Row>
      <Row label="Relacja">
        <Chips
          label="Relacja połączenia"
          limit={CHIPS_SHOWN}
          pinned={2}
          chips={relations}
          value={edge.via === 'articles' ? ARTICLES : (edge.type ?? ANY)}
          // The way the space has the relationship is picked with it; it can be changed after.
          onChange={(v) =>
            onChange(
              v === ARTICLES
                ? { via: 'articles', type: null, direction: 'any', maxHops: 1 }
                : v === ANY
                  ? { via: 'relation', type: null, direction: 'any' }
                  : {
                      via: 'relation',
                      type: v,
                      direction: found.find((o) => o.type === v)?.direction ?? 'any',
                    }
            )
          }
        />
      </Row>
      {edge.type && edge.via === 'relation' && (
        <Row label="Kierunek">
          <DirectionPicker
            source={source}
            target={target}
            phrase={relationName(edge.type)}
            value={edge.direction}
            onChange={(direction) => onChange({ direction })}
          />
        </Row>
      )}
      {edge.via === 'relation' && (
        <Row label="Długość">
          <HopsInput
            value={edge.maxHops}
            max={MAX_HOPS}
            onChange={(maxHops) => onChange({ maxHops })}
          />
        </Row>
      )}
    </div>
  )
}
