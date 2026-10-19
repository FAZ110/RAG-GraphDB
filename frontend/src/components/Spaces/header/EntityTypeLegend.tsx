import { Legend, LegendItem } from '@/components/deck'
import { inkFor } from '@/design/inks'
import type { SpaceStats } from '@/types'
import { TYPE_FORMS, pluralForm, typeName } from '../spaceText'
import { breakdown } from './breakdown'

const SHOWN = 2

interface Props {
  entities: SpaceStats['entities']
}

export function EntityTypeLegend({ entities }: Props) {
  if (entities.total === 0) {
    return <p className="text-sm text-fg-subtle">Pojawią się po pierwszej ekstrakcji.</p>
  }

  const rest = entities.by_label.length - SHOWN
  return (
    <Legend className={breakdown}>
      {entities.by_label.slice(0, SHOWN).map(({ label, count }) => (
        <LegendItem key={label} color={inkFor(label).color}>
          {typeName(label)}
          <span className="font-semibold text-fg tabular-nums">{count}</span>
        </LegendItem>
      ))}
      {rest > 0 && (
        <li className="text-fg-subtle">
          i {rest} {pluralForm(rest, TYPE_FORMS)} więcej
        </li>
      )}
    </Legend>
  )
}
