import { useQuery } from '@tanstack/react-query'
import { RotateCwIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Button, Swatch, focusRing } from '@/components/deck'
import { SpaceMark } from '@/components/nav/SpaceMark'
import { ARTICLE_STATUS } from '@/components/Spaces/articles/articleStatus'
import type { ArticleStatus } from '@/components/Spaces/articles/articleStatus'
import {
  ARTICLE_FORMS,
  ENTITY_FORMS,
  formatDate,
  pluralForm,
  typeName,
} from '@/components/Spaces/spaceText'
import { inkFor } from '@/design/inks'
import { useRetryArticles } from '@/hooks/useBatches'
import { SPACES_QUERY_KEY } from '@/hooks/useSpaces'
import { fetchFreshEntities } from '@/services/home'
import type { Batch } from '@/types'
import { cn } from '@/lib/utils'
import type { FailedArticles, RecentArticle, RecentSpace } from '@/types/home'
import { SectionLabel } from './SectionLabel'

const SHOWN_FRESH = 5

const rowLink = cn(
  'flex items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-surface-sunken',
  focusRing
)

function Rows({ children }: { children: ReactNode }) {
  // Bleeds over the card's padding, so the dividers run its full width.
  return <ul className="-mx-4 divide-y divide-line-soft">{children}</ul>
}

const counted = (count: number, forms: Parameters<typeof pluralForm>[1]) =>
  `${count.toLocaleString('pl-PL')} ${pluralForm(count, forms)}`

export function RecentSpaces({ spaces }: { spaces: RecentSpace[] }) {
  return (
    <section className="flex min-w-0 flex-col gap-2">
      <SectionLabel>Ostatnie przestrzenie</SectionLabel>
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

export function FreshEntities({ spaceId }: { spaceId: string }) {
  const entities =
    useQuery({
      queryKey: [...SPACES_QUERY_KEY, spaceId, 'fresh'],
      queryFn: () => fetchFreshEntities(spaceId),
    }).data ?? []
  if (entities.length === 0) return null
  return (
    <section className="flex min-w-0 flex-col gap-2">
      <SectionLabel>Świeżo wydobyte</SectionLabel>
      <Rows>
        {entities.slice(0, SHOWN_FRESH).map((e) => (
          <li key={e.id}>
            <Link to={`/graph/${spaceId}?focus=${encodeURIComponent(e.id)}`} className={rowLink}>
              <Swatch color={inkFor(e.label).color} />
              <span className="min-w-0 flex-1 truncate text-fg">{e.name}</span>
              <span className="max-w-[40%] shrink-0 truncate text-xs text-fg-subtle">
                {typeName(e.label)}
              </span>
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
    <div className="min-w-0">
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
    </div>
  )
}

function RetryRow({ failed }: { failed: FailedArticles }) {
  const retry = useRetryArticles(failed.space_id)
  const count = failed.article_ids.length
  return (
    <li className="flex items-center gap-3 px-4 py-3 text-sm">
      <Swatch color="var(--status-error)" />
      <span className="min-w-0 flex-1 truncate text-fg">
        <b className="tabular-nums">{count}</b> w {failed.space_name}
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

export function ReadingList({ running, failed }: { running: Batch[]; failed: FailedArticles[] }) {
  return (
    <div className="min-w-0">
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
    </div>
  )
}
