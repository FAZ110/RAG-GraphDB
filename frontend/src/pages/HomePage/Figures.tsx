import { animate } from 'motion/react'
import { useEffect, useRef } from 'react'
import { surface } from '@/components/deck'
import { move, staggerDelay } from '@/design/motion'
import { cn } from '@/lib/utils'
import type { HomeTotals } from '@/types/home'
import { SectionLabel } from './SectionLabel'

function CountUp({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    const show = (v: number) => {
      if (ref.current) ref.current.textContent = Math.round(v).toLocaleString('pl-PL')
    }
    const controls = animate(0, value, { ...move.panel, onUpdate: show })
    return () => controls.stop()
  }, [value])
  return (
    <span ref={ref} className="text-figure text-fg tabular-nums">
      {value.toLocaleString('pl-PL')}
    </span>
  )
}

export function Figures({ totals }: { totals: HomeTotals }) {
  const figures = [
    { label: 'Przestrzenie', value: totals.spaces, note: null },
    {
      label: 'Analizy',
      value: totals.analyses,
      note: totals.week_analyses > 0 && `edytowane w tym tygodniu: ${totals.week_analyses}`,
    },
    {
      label: 'Artykuły',
      value: totals.articles,
      note: totals.week_articles > 0 && `+${totals.week_articles} w tym tygodniu`,
    },
    {
      label: 'Encje',
      value: totals.entities,
      note:
        totals.week_entities > 0 &&
        `+${totals.week_entities.toLocaleString('pl-PL')} w tym tygodniu`,
    },
  ]
  return (
    <div className="grid grid-cols-2 gap-4">
      {figures.map((f, i) => (
        <div
          key={f.label}
          className={cn(surface, 'deck-land flex flex-col gap-1 p-4')}
          style={{ animationDelay: `${staggerDelay(i + 1)}s` }}
        >
          <SectionLabel>{f.label}</SectionLabel>
          <CountUp value={f.value} />
          {f.note && <span className="text-xs text-fg-subtle">{f.note}</span>}
        </div>
      ))}
    </div>
  )
}
