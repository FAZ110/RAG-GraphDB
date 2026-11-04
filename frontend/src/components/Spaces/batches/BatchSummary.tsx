import { PauseIcon, PlayIcon, XIcon } from 'lucide-react'
import { IconButton } from '@/components/deck'
import { isPaused, isRunning, useBatchAction } from '@/hooks/useBatches'
import { cn } from '@/lib/utils'
import type { Batch } from '@/types'
import { ARTICLE_FORMS, ENTITY_FORMS, RELATIONSHIP_FORMS, pluralForm } from '../spaceText'

export function BatchSummary({ batch }: { batch: Batch }) {
  const done = batch.ok + batch.error + batch.cancelled
  const running = isRunning(batch)
  const paused = isPaused(batch)

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line bg-surface px-4 py-3 text-sm">
      {running || paused ? (
        <>
          <span className="font-semibold text-fg">
            {paused ? 'Wstrzymano' : 'Przetwarzanie'}: {done} z {batch.total}
          </span>
          <span className="h-1.5 min-w-24 flex-1 bg-line-soft" aria-hidden="true">
            <span
              className={cn(
                'block h-full transition-[width] spring-panel',
                paused ? 'bg-fg-faint' : 'bg-fg'
              )}
              style={{ width: `${(done / batch.total) * 100}%` }}
            />
          </span>
          <BatchControls batch={batch} paused={paused} />
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
      {batch.cancelled > 0 && (
        <span className="font-semibold text-status-cancelled">
          Anulowano {batch.cancelled} {pluralForm(batch.cancelled, ARTICLE_FORMS)}
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

function BatchControls({ batch, paused }: { batch: Batch; paused: boolean }) {
  const action = useBatchAction(batch)
  const error = action.error?.message

  return (
    <span className="flex gap-2">
      <IconButton
        size="icon-sm"
        label={error ?? (paused ? 'Wznów' : 'Wstrzymaj')}
        disabled={action.isPending}
        onClick={() => action.mutate(paused ? 'resume' : 'pause')}
      >
        {paused ? <PlayIcon /> : <PauseIcon />}
      </IconButton>
      <IconButton
        size="icon-sm"
        variant="danger-outline"
        label={error ?? 'Anuluj'}
        disabled={action.isPending}
        onClick={() => action.mutate('cancel')}
      >
        <XIcon />
      </IconButton>
    </span>
  )
}
