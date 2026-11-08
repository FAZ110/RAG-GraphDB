import { motion } from 'motion/react'
import { useState } from 'react'
import { surface } from '@/components/deck'
import { ENTITY_FORMS, pluralForm } from '@/components/Spaces/spaceText'
import { move, staggerDelay } from '@/design/motion'
import { cn } from '@/lib/utils'
import type { ActivityDay } from '@/types/home'
import { WEEKS, calendar, growth, level } from './calendar'
import { SectionLabel } from './SectionLabel'

const LEVELS = ['bg-line-soft', 'bg-fg/20', 'bg-fg/40', 'bg-fg/70', 'bg-fg']
const CHANGE_FORMS = { one: 'zmiana', few: 'zmiany', many: 'zmian' }
const dayFormat = new Intl.DateTimeFormat('pl-PL', { day: 'numeric', month: 'long' })

interface Props {
  activity: ActivityDay[]
  entities: number
  weekEntities: number
}

export function Activity({ activity, entities, weekEntities }: Props) {
  const [now] = useState(() => new Date())
  const days = calendar(activity, now)
  const busiest = Math.max(1, ...days.map((d) => d.work))
  const counts = growth(days, entities)
  const lowest = counts[0]
  const span = Math.max(1, entities - lowest)
  const points = counts
    .map(
      (c, i) => `${(i / Math.max(1, counts.length - 1)) * 200},${56 - ((c - lowest) / span) * 52}`
    )
    .join(' ')

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_1fr]">
      <section className={cn(surface, 'flex flex-col gap-3 p-4')}>
        <SectionLabel>Aktywność · ostatnie {WEEKS} tygodni</SectionLabel>
        <div className="grid grid-flow-col grid-rows-7 justify-start gap-[3px] overflow-x-auto">
          {days.map((d, i) => (
            <motion.span
              key={d.key}
              title={
                d.future
                  ? undefined
                  : `${dayFormat.format(d.date)}: ${d.work} ${pluralForm(d.work, CHANGE_FORMS)}, ${d.entities} ${pluralForm(d.entities, ENTITY_FORMS)}`
              }
              className={cn('size-3', d.future ? 'bg-transparent' : LEVELS[level(d.work, busiest)])}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ ...move.quick, delay: staggerDelay(Math.floor(i / 7)) }}
            />
          ))}
        </div>
        <p className="text-xs text-fg-subtle">
          Każdy kwadrat to dzień: wgrane artykuły i edycje analiz.
        </p>
      </section>
      <section className={cn(surface, 'flex flex-col gap-1 p-4')}>
        <SectionLabel>Wzrost grafu</SectionLabel>
        <p className="flex items-baseline gap-2">
          <span className="text-figure text-fg tabular-nums">
            {entities.toLocaleString('pl-PL')}
          </span>
          {weekEntities > 0 && (
            <span className="text-sm font-semibold text-status-ok">
              +{weekEntities.toLocaleString('pl-PL')} w tym tygodniu
            </span>
          )}
        </p>
        <svg viewBox="0 0 200 60" className="mt-auto w-full" aria-hidden="true">
          <motion.polyline
            points={points}
            fill="none"
            className="stroke-fg"
            strokeWidth={2}
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={move.panel}
          />
        </svg>
      </section>
    </div>
  )
}
