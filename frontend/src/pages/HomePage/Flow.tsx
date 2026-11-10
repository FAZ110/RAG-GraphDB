import { useIsMutating, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { AnalysisCard } from '@/components/Analysis/list/AnalysisCard'
import { ErrorNote, dashedFrame, focusRing } from '@/components/deck'
import { pluralForm } from '@/components/Spaces/spaceText'
import { RETRY_MUTATION_KEY, useRunningBatches } from '@/hooks/useBatches'
import { cn } from '@/lib/utils'
import { fetchAllAnalyses } from '@/services/analyses'
import type { FailedArticles } from '@/types/home'
import { ReadingList } from './Lists'

const SHOWN_ANALYSES = 2
const ANALYSIS_FORMS = { one: 'analiza', few: 'analizy', many: 'analiz' }
const READ_FORMS = { one: 'przeczytany', few: 'przeczytane', many: 'przeczytanych' }

interface StationProps {
  stage: string
  count: number
  unit: string
  note?: ReactNode
  alarm?: boolean
  action?: { to: string; label: string }
  children: ReactNode
}

export function Station({ stage, count, unit, note, alarm, action, children }: StationProps) {
  const ink = alarm ? 'bg-status-error' : 'bg-fg'
  return (
    <section className="group/station flex min-w-0 flex-col gap-3 border-t border-line-soft p-4 first:border-t-0 xl:border-t-0 xl:border-l xl:first:border-l-0">
      <div className="relative -mx-4 h-5 overflow-hidden">
        <span className={cn('absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2', ink)} />
        <span className={cn('absolute top-1 left-4 size-3', ink)} />
        <span
          className={cn(
            'absolute top-0.5 left-7 bg-surface px-2 text-xs font-medium',
            alarm ? 'text-status-error' : 'text-fg'
          )}
        >
          {stage}
        </span>
        {/* Only where the stops sit side by side; stacked, the page itself reads downwards. */}
        <span
          aria-hidden="true"
          className={cn(
            'absolute top-1 right-0 hidden size-3 [clip-path:polygon(0_0,100%_50%,0_100%)] xl:block xl:group-last/station:hidden',
            ink
          )}
        />
      </div>
      <header className="flex items-baseline gap-2">
        <span className="text-display-xl text-fg tabular-nums">
          {count.toLocaleString('pl-PL')}
        </span>
        <span className="min-w-0 truncate font-semibold text-fg-soft">{unit}</span>
        {action && (
          <Link
            to={action.to}
            className={cn('ml-auto shrink-0 text-sm text-fg-muted hover:text-fg', focusRing)}
          >
            {action.label}
          </Link>
        )}
      </header>
      {note && <p className="-mt-2 text-xs text-fg-subtle">{note}</p>}
      <div className="flex min-w-0 flex-1 flex-col gap-4">{children}</div>
    </section>
  )
}

export function ReadingStation({
  articles,
  failed: failedNow,
  spaceId,
}: {
  articles: number
  failed: FailedArticles[]
  spaceId?: string
}) {
  const latest = { batches: useRunningBatches().data ?? [], failed: failedNow }
  // The queue and the failed list refresh one after the other; until both are back, the
  // retried articles would show as failed and queued at once, or as neither.
  const retrying = useIsMutating({ mutationKey: RETRY_MUTATION_KEY }) > 0
  const key = JSON.stringify(latest)
  const [held, setHeld] = useState({ key, ...latest })
  if (!retrying && held.key !== key) setHeld({ key, ...latest })
  const { batches, failed } = retrying ? held : latest
  const running = spaceId ? batches.filter((b) => b.space_id === spaceId) : batches
  const queued = running.reduce((sum, b) => sum + b.total - b.ok - b.error, 0)
  const broken = failed.reduce((sum, f) => sum + f.article_ids.length, 0)
  const read = Math.max(0, articles - broken - queued)
  const live = running.length > 0
  return (
    <Station
      stage="Czytanie"
      count={live ? queued : read}
      unit={live ? 'w kolejce' : pluralForm(read, READ_FORMS)}
      note={broken > 0 && `${broken} z błędem`}
      alarm={broken > 0}
    >
      {live || broken > 0 ? (
        <ReadingList running={running} failed={failed} />
      ) : (
        <p className="text-sm text-fg-subtle">Każdy wgrany artykuł został przeczytany.</p>
      )}
    </Station>
  )
}

export function AnalysisStation({ spaceId, note }: { spaceId?: string; note?: ReactNode }) {
  const analyses = useQuery({ queryKey: ['analyses', 'all'], queryFn: fetchAllAnalyses })
  const own = (analyses.data ?? []).filter((a) => !spaceId || a.space_id === spaceId)
  const latest = own
    .toSorted((a, b) => b.updated_at.localeCompare(a.updated_at))
    .slice(0, SHOWN_ANALYSES)
  return (
    <Station
      stage="Analiza"
      count={own.length}
      unit={pluralForm(own.length, ANALYSIS_FORMS)}
      note={note}
      action={{ to: '/analyses', label: 'Analizy' }}
    >
      {analyses.error && <ErrorNote>{analyses.error.message}</ErrorNote>}
      {analyses.data && own.length === 0 && (
        <Link
          to="/analyses"
          className={cn(
            dashedFrame,
            focusRing,
            'p-4 text-center text-sm text-fg-subtle hover:text-fg'
          )}
        >
          Zbierz encje z artykułów na płótnie
        </Link>
      )}
      <div className="flex flex-col gap-4 [--lift-rest:0px]">
        {latest.map((a) => (
          <AnalysisCard key={a.id} analysis={a} />
        ))}
      </div>
    </Station>
  )
}
