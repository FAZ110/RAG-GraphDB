import { Tooltip } from 'radix-ui'
import { focusRing, Legend, LegendItem, surface } from '@/components/deck'
import { inkFor } from '@/design/inks'
import { cn } from '@/lib/utils'
import type { SpaceStats } from '@/types'
import { TYPE_FORMS, pluralForm, typeName } from '../spaceText'
import { breakdown } from './breakdown'

const SHOWN = 2
const LISTED = 10

type Types = SpaceStats['entities']['by_label']

interface Props {
  entities: SpaceStats['entities']
}

function Count({ count }: { count: number }) {
  return <span className="font-semibold text-fg tabular-nums">{count}</span>
}

const more = (count: number) => `i ${count} ${pluralForm(count, TYPE_FORMS)} więcej`

function RestOfTypes({ types }: { types: Types }) {
  return (
    <Tooltip.Provider delayDuration={150}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <button
            type="button"
            className={cn(
              'cursor-default text-fg-subtle underline decoration-dotted underline-offset-4 hover:text-fg',
              focusRing
            )}
          >
            {more(types.length)}
          </button>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            side="bottom"
            align="start"
            sideOffset={8}
            collisionPadding={12}
            className={cn(
              surface,
              'z-60 animate-in p-3 text-sm text-fg-muted fade-in-0 spring-quick'
            )}
          >
            <ul className="space-y-1.5">
              {types.slice(0, LISTED).map(({ label, count }) => (
                <LegendItem key={label} color={inkFor(label).color}>
                  {typeName(label)}
                  <span className="ml-auto pl-4">
                    <Count count={count} />
                  </span>
                </LegendItem>
              ))}
            </ul>
            {types.length > LISTED && (
              <p className="mt-2 border-t border-line-soft pt-2 text-fg-subtle">
                +{types.length - LISTED} rzadszych
              </p>
            )}
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  )
}

export function EntityTypeLegend({ entities }: Props) {
  if (entities.total === 0) {
    return <p className="text-sm text-fg-subtle">Pojawią się po pierwszej ekstrakcji.</p>
  }

  const rest = entities.by_label.slice(SHOWN)
  return (
    <Legend className={breakdown}>
      {entities.by_label.slice(0, SHOWN).map(({ label, count }) => (
        <LegendItem key={label} color={inkFor(label).color}>
          {typeName(label)}
          <Count count={count} />
        </LegendItem>
      ))}
      {rest.length > 0 && (
        <li>
          <RestOfTypes types={rest} />
        </li>
      )}
    </Legend>
  )
}
