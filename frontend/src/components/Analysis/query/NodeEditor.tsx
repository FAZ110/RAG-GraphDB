import { typeName } from '@/components/Spaces/spaceText'
import type { SpaceSchema } from '@/types/query'
import { Chips } from './Chips'
import type { PatternNode } from './pattern'
import { Row } from './Row'
import { LinkCountEditor } from './LinkCountEditor'

const ANY = '*'
// The most common choices shown at once; the rest are found by typing.
const CHIPS_SHOWN = 8

interface Props {
  node: PatternNode
  schema: SpaceSchema | undefined
  onChange: (change: Partial<PatternNode>) => void
}

/** What the sought entity must be: its type and the conditions on it. */
export function NodeEditor({ node, schema, onChange }: Props) {
  const types = [
    { value: ANY, label: 'Dowolny' },
    ...(schema?.labels ?? []).map((l) => ({
      value: l.label,
      label: typeName(l.label),
      count: l.count,
    })),
  ]
  return (
    <div className="flex flex-col divide-y divide-line-soft *:py-3 *:first:pt-0 *:last:pb-0">
      <Row label="Typ">
        <Chips
          label="Typ szukanej encji"
          limit={CHIPS_SHOWN}
          chips={types}
          value={node.label ?? ANY}
          onChange={(v) => onChange({ label: v === ANY ? null : v })}
        />
      </Row>
      <Row label="Powiązania">
        <LinkCountEditor
          label={node.label}
          value={node.linkCount}
          schema={schema}
          onChange={(linkCount) => onChange({ linkCount })}
        />
      </Row>
      <Row label="Nazwa zawiera">
        <input
          value={node.nameContains}
          onChange={(e) => onChange({ nameContains: e.target.value })}
          placeholder="Wpisz fragment nazwy…"
          aria-label="Nazwa zawiera"
          className="h-8 w-full max-w-xs border border-line bg-surface px-2.5 text-sm text-fg outline-none placeholder:text-fg-subtle focus:border-fg"
        />
      </Row>
    </div>
  )
}
