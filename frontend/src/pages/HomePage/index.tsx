import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnalysisCard } from '@/components/Analysis/list/AnalysisCard'
import { useCurrentSpace } from '@/components/nav/useCurrentSpace'
import { Button, EmptyState, ErrorNote, dashedFrame, focusRing } from '@/components/deck'
import { ARTICLE_FORMS, ENTITY_FORMS, pluralForm } from '@/components/Spaces/spaceText'
import { SPACES_QUERY_KEY } from '@/hooks/useSpaces'
import { cn } from '@/lib/utils'
import { fetchAllAnalyses } from '@/services/analyses'
import { fetchHome } from '@/services/home'
import type { HomeTotals } from '@/types/home'
import { Activity } from './Activity'
import { Figures } from './Figures'
import { FreshEntities } from './FreshEntities'
import { LiveGraph } from './LiveGraph'
import { Attention, RecentArticles, RecentSpaces } from './Lists'
import { SectionLabel } from './SectionLabel'

// shortcut: kept per browser and moved on every visit, so a reload shows the week instead; store it on the server if "since last time" must survive that.
const LAST_VISIT = 'atlas:last-visit'
const RECENT_ANALYSES = 4
const dateFormat = new Intl.DateTimeFormat('pl-PL', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
})

function useLastVisit(): string | null {
  const [since] = useState(() => {
    try {
      return localStorage.getItem(LAST_VISIT)
    } catch {
      return null
    }
  })
  useEffect(() => {
    try {
      localStorage.setItem(LAST_VISIT, new Date().toISOString())
    } catch {
      /* storage unavailable: every visit is a first one */
    }
  }, [])
  return since
}

const counted = (count: number, forms: Parameters<typeof pluralForm>[1]) =>
  `${count.toLocaleString('pl-PL')} ${pluralForm(count, forms)}`

function Summary({ totals, since }: { totals: HomeTotals; since: string | null }) {
  const [articles, entities, when] =
    since && totals.new_articles + totals.new_entities > 0
      ? [totals.new_articles, totals.new_entities, 'Od ostatniej wizyty']
      : [totals.week_articles, totals.week_entities, 'W tym tygodniu']
  if (articles + entities === 0) return <>Wgraj artykuły, a model zbuduje z nich graf powiązań.</>
  return (
    <>
      {when} przybyło <b className="text-fg">{counted(articles, ARTICLE_FORMS)}</b> i{' '}
      <b className="text-fg">{counted(entities, ENTITY_FORMS)}</b>.
    </>
  )
}

export function HomePage() {
  const since = useLastVisit()
  const { space } = useCurrentSpace()
  const [now] = useState(() => new Date())
  const home = useQuery({
    queryKey: [...SPACES_QUERY_KEY, 'home', since],
    queryFn: () => fetchHome(since),
  })
  const analyses = useQuery({ queryKey: ['analyses', 'all'], queryFn: fetchAllAnalyses })

  if (home.error) return <ErrorNote>{home.error.message}</ErrorNote>
  if (!home.data) return null
  const { totals, recent_spaces, recent_articles, failed, activity } = home.data

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

  const recentAnalyses = (analyses.data ?? [])
    .toSorted((a, b) => b.updated_at.localeCompare(a.updated_at))
    .slice(0, RECENT_ANALYSES)

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-10 py-4">
      <div className="grid grid-cols-1 items-stretch gap-8 lg:grid-cols-[1fr_1.1fr]">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <SectionLabel>Start · {dateFormat.format(now)}</SectionLabel>
            <h1 className="text-display text-fg @md:text-display-lg">
              {now.getHours() >= 18 ? 'Dobry wieczór.' : 'Dzień dobry.'}
            </h1>
            <p className="text-fg-muted">
              <Summary totals={totals} since={since} />
            </p>
          </div>
          <Figures totals={totals} />
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="primary">
              <Link to="/spaces">Załaduj artykuły →</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link to="/analyses">Nowa analiza</Link>
            </Button>
          </div>
        </div>
        {space && space.entity_count > 0 && <LiveGraph space={space} />}
      </div>

      {space && <FreshEntities space={space} />}
      <Activity
        activity={activity}
        entities={totals.entities}
        weekEntities={totals.week_entities}
      />

      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[1.5fr_1fr]">
        <div className="flex min-w-0 flex-col gap-8">
          <section className="flex flex-col gap-2">
            <SectionLabel
              action={
                <Link
                  to="/analyses"
                  className={cn('text-xs text-fg-subtle hover:text-fg', focusRing)}
                >
                  Wszystkie →
                </Link>
              }
            >
              Wróć do pracy
            </SectionLabel>
            {analyses.error && <ErrorNote>{analyses.error.message}</ErrorNote>}
            {analyses.data && recentAnalyses.length === 0 && (
              <Link
                to="/analyses"
                className={cn(
                  dashedFrame,
                  focusRing,
                  'p-6 text-center text-sm text-fg-subtle hover:text-fg'
                )}
              >
                Nie masz jeszcze analiz. Zbierz encje z artykułów na płótnie →
              </Link>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              {recentAnalyses.map((a) => (
                <AnalysisCard key={a.id} analysis={a} />
              ))}
            </div>
          </section>
          {recent_articles.length > 0 && <RecentArticles articles={recent_articles} />}
        </div>
        <div className="flex min-w-0 flex-col gap-8">
          <Attention failed={failed} />
          <RecentSpaces spaces={recent_spaces} />
        </div>
      </div>
    </div>
  )
}
