import { isRunning } from '@/hooks/useBatches'
import type { Batch } from '@/types'

export function BatchCount({ batch }: { batch: Batch }) {
  if (isRunning(batch)) {
    return (
      <span className="text-sm font-semibold text-fg-subtle tabular-nums">
        {batch.ok + batch.error}/{batch.total}
      </span>
    )
  }
  return <span className="text-sm font-normal text-fg-subtle tabular-nums">{batch.total}</span>
}
