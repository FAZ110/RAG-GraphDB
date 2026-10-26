import { isRunning } from '@/hooks/useBatches'
import type { Batch } from '@/types'
import { ARTICLE_FORMS, ENTITY_FORMS, RELATIONSHIP_FORMS, pluralForm } from '../spaceText'

export function BatchSummary({ batch }: { batch: Batch }) {
  const done = batch.ok + batch.error

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line bg-surface px-4 py-3 text-sm">
      {isRunning(batch) ? (
        <>
          <span className="font-semibold text-fg">
            Przetwarzanie: {done} z {batch.total}
          </span>
          <span className="h-1.5 min-w-24 flex-1 bg-line-soft" aria-hidden="true">
            <span
              className="block h-full bg-fg transition-[width] spring-panel"
              style={{ width: `${(done / batch.total) * 100}%` }}
            />
          </span>
        </>
      ) : (
        <span className="text-fg-muted">
          Dodano <span className="font-semibold text-fg">{batch.ok}</span>{' '}
          {pluralForm(batch.ok, ARTICLE_FORMS)}:{' '}
          <span className="font-semibold text-fg">{batch.nodes_count}</span>{' '}
          {pluralForm(batch.nodes_count, ENTITY_FORMS)} i{' '}
          <span className="font-semibold text-fg">{batch.edges_count}</span>{' '}
          {pluralForm(batch.edges_count, RELATIONSHIP_FORMS)}
        </span>
      )}
      {batch.error > 0 && (
        <span className="font-semibold text-danger">
          {batch.error} {pluralForm(batch.error, ARTICLE_FORMS)} z błędem
        </span>
      )}
    </div>
  )
}
