import { Legend, LegendItem } from '@/components/deck'
import type { SpaceStats } from '@/types'
import { ARTICLE_STATUS, STATUS_ORDER } from '../articles/articleStatus'
import { breakdown } from './breakdown'

interface Props {
  articles: SpaceStats['articles']
}

export function ArticleStatusBar({ articles }: Props) {
  if (articles.total === 0) {
    return (
      <>
        <div className="h-2.5 border border-dashed border-line" />
        <p className="text-sm text-fg-subtle">Dodaj artykuły, żeby zbudować graf.</p>
      </>
    )
  }

  const present = STATUS_ORDER.filter((key) => articles.by_status[key] > 0)
  return (
    <>
      <div className="flex h-2.5 gap-px overflow-hidden bg-surface">
        {present.map((key) => (
          <div
            key={key}
            className="transition-[flex-grow] spring-panel"
            style={{
              backgroundColor: ARTICLE_STATUS[key].color,
              flexBasis: 0,
              flexGrow: articles.by_status[key],
            }}
          />
        ))}
      </div>
      <Legend className={breakdown}>
        {present.map((key) => (
          <LegendItem key={key} color={ARTICLE_STATUS[key].color}>
            <span className="font-semibold text-fg tabular-nums">{articles.by_status[key]}</span>
            {ARTICLE_STATUS[key].many}
          </LegendItem>
        ))}
      </Legend>
    </>
  )
}
