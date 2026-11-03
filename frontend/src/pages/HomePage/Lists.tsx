import { RotateCwIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Button, Swatch, focusRing, surface } from '@/components/deck'
import { SpaceMark } from '@/components/nav/SpaceMark'
import { ARTICLE_STATUS } from '@/components/Spaces/articles/articleStatus'
import type { ArticleStatus } from '@/components/Spaces/articles/articleStatus'
import { ARTICLE_FORMS, ENTITY_FORMS, formatDate, pluralForm } from '@/components/Spaces/spaceText'
import { inkFor } from '@/design/inks'
import { useRetryArticles, useRunningBatches } from '@/hooks/useBatches'
import { cn } from '@/lib/utils'
import type { FailedArticles, RecentArticle, RecentSpace } from '@/types/home'
import { SectionLabel } from './SectionLabel'

const rowLink = cn(
  'flex items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-surface-sunken',
  focusRing
)

function Rows({ children }: { children: ReactNode }) {
  return <ul className={cn(surface, 'divide-y divide-line-soft')}>{children}</ul>
}

const counted = (count: number, forms: Parameters<typeof pluralForm>[1]) =>
  `${count.toLocaleString('pl-PL')} ${pluralForm(count, forms)}`

export function RecentSpaces({ spaces }: { spaces: RecentSpace[] }) {
  return (
    <section className="flex flex-col gap-2">
      <SectionLabel
        action={
          <Link to="/spaces" className={cn('text-xs text-fg-subtle hover:text-fg', focusRing)}>
            Wszystkie →
          </Link>
        }
      >
        Ostatnie przestrzenie
      </SectionLabel>
      <Rows>
        {spaces.map((s) => (
          <li key={s.id}>
            <Link to={`/spaces/${s.id}`} className={cn(rowLink, 'group')}>
              <SpaceMark space={s} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium text-fg">{s.name}</span>
                <span className="block text-xs text-fg-subtle">
                  {counted(s.article_count, ARTICLE_FORMS)} ·{' '}
                  {counted(s.entity_count, ENTITY_FORMS)}
                </span>
              </span>
              <span className="shrink-0 text-xs text-fg-faint">{formatDate(s.last_used)}</span>
            </Link>
          </li>
        ))}
      </Rows>
    </section>
  )
}

function articleNote(a: RecentArticle) {
  if (a.status === 'ok' && a.nodes_count !== null) return counted(a.nodes_count, ENTITY_FORMS)
  return ARTICLE_STATUS[a.status as ArticleStatus]?.label ?? a.status
}

export function RecentArticles({ articles }: { articles: RecentArticle[] }) {
  return (
    <section className="flex flex-col gap-2">
      <SectionLabel>Ostatnio wgrane artykuły</SectionLabel>
      <Rows>
        {articles.map((a) => (
          <li key={a.id}>
            <Link to={`/spaces/${a.space_id}?article=${a.id}`} className={rowLink}>
              <Swatch color={inkFor(a.space_id).color} label={a.space_name} />
              <span className="min-w-0 flex-1 truncate text-fg">
                {a.title || a.url || 'Bez tytułu'}
              </span>
              <span
                className={cn(
                  'shrink-0 text-xs text-fg-subtle',
                  a.status === 'error' && 'text-status-error'
                )}
              >
                {articleNote(a)} · {formatDate(a.created_at)}
              </span>
            </Link>
          </li>
        ))}
      </Rows>
    </section>
  )
}

function RetryRow({ failed }: { failed: FailedArticles }) {
  const retry = useRetryArticles(failed.space_id)
  const count = failed.article_ids.length
  return (
    <li className="flex items-center gap-3 px-4 py-3 text-sm">
      <Swatch color="var(--status-error)" />
      <span className="min-w-0 flex-1 truncate text-fg">
        {counted(count, ARTICLE_FORMS)} z błędem · {failed.space_name}
      </span>
      <Button
        size="sm"
        variant="danger-outline"
        disabled={retry.isPending}
        title={retry.error?.message}
        onClick={() => retry.mutate(failed.article_ids)}
      >
        <RotateCwIcon className={cn(retry.isPending && 'animate-spin')} />
        Ponów
      </Button>
    </li>
  )
}

export function Attention({ failed }: { failed: FailedArticles[] }) {
  const running = useRunningBatches().data ?? []
  if (running.length === 0 && failed.length === 0) return null
  return (
    <section className="flex flex-col gap-2">
      <SectionLabel>Na żywo</SectionLabel>
      <Rows>
        {running.map((b) => {
          const done = b.ok + b.error
          return (
            <li key={b.id} className="flex flex-col gap-2 px-4 py-3 text-sm">
              <span className="flex items-center gap-3">
                <Swatch color={inkFor(b.space_id).color} className="animate-pulse" />
                <span className="min-w-0 flex-1 truncate text-fg">Ekstrakcja · {b.space_name}</span>
                <span className="text-xs text-fg-subtle tabular-nums">
                  {done} / {b.total}
                </span>
              </span>
              <span className="h-1.5 bg-line-soft">
                <span
                  className="block h-full bg-fg transition-[width] spring-panel"
                  style={{ width: `${(done / Math.max(1, b.total)) * 100}%` }}
                />
              </span>
            </li>
          )
        })}
        {failed.map((f) => (
          <RetryRow key={f.space_id} failed={f} />
        ))}
      </Rows>
    </section>
  )
}
