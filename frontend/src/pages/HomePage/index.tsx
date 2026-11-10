import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useCurrentSpace } from '@/components/nav/useCurrentSpace'
import { Button, EmptyState, ErrorNote } from '@/components/deck'
import { ARTICLE_FORMS, ENTITY_FORMS, pluralForm } from '@/components/Spaces/spaceText'
import { SPACES_QUERY_KEY } from '@/hooks/useSpaces'
import { fetchHome } from '@/services/home'
import type { HomeTotals } from '@/types/home'
import { Activity } from './Activity'
import { AnalysisStation, ReadingStation, Station } from './Flow'
import { RecentSpaces } from './Lists'
import { Scope } from './Scope'
import { SpaceSection } from './SpaceSection'
import { HomeSkeleton } from './HomeSkeleton'

const counted = (count: number, forms: Parameters<typeof pluralForm>[1]) =>
  `${count.toLocaleString('pl-PL')} ${pluralForm(count, forms)}`

function Summary({ totals, since }: { totals: HomeTotals; since: string | null }) {
  const [articles, entities, when] =
    since && totals.new_articles + totals.new_entities > 0
      ? [totals.new_articles, totals.new_entities, 'Od ostatniej wizyty']
      : [totals.week_articles, totals.week_entities, 'W tym tygodniu']
  if (articles + entities === 0) return <>Wgraj artykuły, a model zbuduje z nich graf powiązań.</>
  // Parts that are 0 are left out; the verb agrees with the first part named.
  const parts = [
    {
      count: articles,
      forms: ARTICLE_FORMS,
      verb: { one: 'przybył', few: 'przybyły', many: 'przybyło' },
    },
    {
      count: entities,
      forms: ENTITY_FORMS,
      verb: { one: 'przybyła', few: 'przybyły', many: 'przybyło' },
    },
  ].filter((p) => p.count > 0)
  return (
    <>
      {when} {pluralForm(parts[0].count, parts[0].verb)}{' '}
      {parts.map((p, i) => (
        <span key={i}>
          {i > 0 && ' i '}
          <b className="text-fg">{counted(p.count, p.forms)}</b>
        </span>
      ))}
      .
    </>
  )
}

export function HomePage() {
  const { space } = useCurrentSpace()
  const [now] = useState(() => new Date())
  const [onlySpace, setOnlySpace] = useState(false)
  const shownSpace = onlySpace ? space : undefined
  const home = useQuery({
    queryKey: [...SPACES_QUERY_KEY, 'home'],
    queryFn: fetchHome,
  })

  if (home.error) return <ErrorNote>{home.error.message}</ErrorNote>
  if (!home.data) return <HomeSkeleton />
  const { since, totals, recent_spaces, failed, activity } = home.data

  if (totals.spaces === 0) {
    return (
      <EmptyState
        title="Zacznij od przestrzeni"
        className="mx-auto mt-10 min-h-80 max-w-6xl"
        action={
          <Button asChild variant="primary">
            <Link to="/spaces">Utwórz przestrzeń</Link>
          </Button>
        }
      >
        Przestrzeń zbiera artykuły, z których model wydobywa encje i powiązania. Tu zobaczysz potem
        ostatnią pracę i to, co się zmieniło.
      </EmptyState>
    )
  }

  return (
    <Scope
      space={space}
      onlySpace={shownSpace !== undefined}
      onChange={setOnlySpace}
      lead={
        <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
          <div className="flex flex-wrap items-baseline gap-x-2 text-sm text-fg-muted">
            <h1 className="font-semibold text-fg">
              {now.getHours() >= 18 ? 'Dobry wieczór.' : 'Dzień dobry.'}
            </h1>
            <p>
              <Summary totals={totals} since={since} />
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="primary" size="sm">
              <Link to="/spaces">Załaduj artykuły</Link>
            </Button>
            <Button asChild variant="secondary" size="sm">
              <Link to="/analyses">Nowa analiza</Link>
            </Button>
          </div>
        </header>
      }
    >
      {shownSpace ? (
        <SpaceSection space={shownSpace} failed={failed} />
      ) : (
        <>
          <Station
            stage="Wgrywanie"
            count={totals.articles}
            unit={pluralForm(totals.articles, ARTICLE_FORMS)}
            note={totals.week_articles > 0 && `+${totals.week_articles} w tym tygodniu`}
            action={{ to: '/spaces', label: 'Przestrzenie' }}
          >
            <RecentSpaces spaces={recent_spaces} />
          </Station>
          <ReadingStation articles={totals.articles} failed={failed} />
          <Station
            stage="Wydobycie"
            count={totals.entities}
            unit={pluralForm(totals.entities, ENTITY_FORMS)}
            note={totals.week_entities > 0 && `+${totals.week_entities} w tym tygodniu`}
            action={{ to: '/graph', label: 'Graf' }}
          >
            <Activity activity={activity} />
          </Station>
          <AnalysisStation
            note={totals.week_analyses > 0 && `edytowane w tym tygodniu: ${totals.week_analyses}`}
          />
        </>
      )}
    </Scope>
  )
}
