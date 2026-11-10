import { ArticleStatusBar } from '@/components/Spaces/header/ArticleStatusBar'
import { EntityTypeLegend } from '@/components/Spaces/header/EntityTypeLegend'
import {
  ARTICLE_FORMS,
  ENTITY_FORMS,
  RELATIONSHIP_FORMS,
  pluralForm,
} from '@/components/Spaces/spaceText'
import { useSpaceArticles, useSpaceStats } from '@/hooks/useSpaces'
import type { Space } from '@/types'
import type { FailedArticles } from '@/types/home'
import { AnalysisStation, ReadingStation, Station } from './Flow'
import { FreshEntities, RecentArticles } from './Lists'

const RECENT_ARTICLES = 6

export function SpaceSection({ space, failed }: { space: Space; failed: FailedArticles[] }) {
  const stats = useSpaceStats(space.id).data
  const articles = useSpaceArticles(space.id).data ?? []
  const recentArticles = articles
    .toSorted((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, RECENT_ARTICLES)
    .map((a) => ({ ...a, space_id: space.id, space_name: space.name }))
  const links = stats?.relationships

  return (
    <>
      <Station
        stage="Wgrywanie"
        count={space.article_count}
        unit={pluralForm(space.article_count, ARTICLE_FORMS)}
        action={{ to: `/spaces/${space.id}`, label: 'Przestrzeń' }}
      >
        {stats && <ArticleStatusBar articles={stats.articles} />}
        <RecentArticles articles={recentArticles} />
      </Station>
      <ReadingStation
        articles={space.article_count}
        failed={failed.filter((f) => f.space_id === space.id)}
        spaceId={space.id}
      />
      <Station
        stage="Wydobycie"
        count={space.entity_count}
        unit={pluralForm(space.entity_count, ENTITY_FORMS)}
        note={links !== undefined && `${links} ${pluralForm(links, RELATIONSHIP_FORMS)}`}
        action={{ to: `/graph/${space.id}`, label: 'Graf' }}
      >
        {stats && <EntityTypeLegend entities={stats.entities} />}
        <FreshEntities spaceId={space.id} />
      </Station>
      <AnalysisStation spaceId={space.id} />
    </>
  )
}
