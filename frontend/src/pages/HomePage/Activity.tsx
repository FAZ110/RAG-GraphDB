import { motion } from 'motion/react'
import { useState } from 'react'
import { ENTITY_FORMS, pluralForm } from '@/components/Spaces/spaceText'
import { move, staggerDelay } from '@/design/motion'
import { cn } from '@/lib/utils'
import type { ActivityDay } from '@/types/home'
import { WEEKS, calendar, level } from './calendar'
import { SectionLabel } from './SectionLabel'

const LEVELS = ['bg-line-soft', 'bg-fg/20', 'bg-fg/40', 'bg-fg/70', 'bg-fg']
const CHANGE_FORMS = { one: 'zmiana', few: 'zmiany', many: 'zmian' }
const dayFormat = new Intl.DateTimeFormat('pl-PL', { day: 'numeric', month: 'long' })

export function Activity({ activity }: { activity: ActivityDay[] }) {
  const [now] = useState(() => new Date())
  const days = calendar(activity, now)
  const busiest = Math.max(1, ...days.map((d) => d.work))

  return (
    <section className="flex min-w-0 flex-col gap-3">
      <SectionLabel>Aktywność z {WEEKS} tygodni</SectionLabel>
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
  )
}
