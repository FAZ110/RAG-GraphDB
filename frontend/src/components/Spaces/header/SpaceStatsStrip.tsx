import { StatCell, StatFigure } from '@/components/deck'
import { useSpaceStats } from '@/hooks/useSpaces'
import { ARTICLE_FORMS, ENTITY_FORMS, RELATIONSHIP_FORMS, pluralForm } from '../spaceText'
import { ArticleStatusBar } from './ArticleStatusBar'
import { EntityTypeLegend } from './EntityTypeLegend'
import { StatsPlaceholder } from './StatsPlaceholder'

const grid = 'grid gap-px bg-line sm:grid-cols-2'

export function SpaceStatsStrip({ spaceId }: { spaceId: string }) {
  const stats = useSpaceStats(spaceId)
  if (!stats.data) return <StatsPlaceholder className={grid} />

  const { articles, entities, relationships } = stats.data
  return (
    <div className={grid}>
      <StatCell
        figures={
          <StatFigure count={articles.total} unit={pluralForm(articles.total, ARTICLE_FORMS)} />
        }
      >
        <ArticleStatusBar articles={articles} />
      </StatCell>
      <StatCell
        figures={
          <>
            <StatFigure count={entities.total} unit={pluralForm(entities.total, ENTITY_FORMS)} />
            <StatFigure
              count={relationships}
              unit={pluralForm(relationships, RELATIONSHIP_FORMS)}
            />
          </>
        }
      >
        <EntityTypeLegend entities={entities} />
      </StatCell>
    </div>
  )
}
