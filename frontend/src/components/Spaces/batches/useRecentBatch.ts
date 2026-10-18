import { useSearchParams } from 'react-router-dom'
import { useLatestBatch } from '@/hooks/useBatches'
import { useClosedBatches } from './closedBatches'

export type ArticlesTab = 'all' | 'recent'

// The space's latest upload has its own tab, kept in the address, until the user closes it.
export function useRecentBatch(spaceId: string) {
  const [params, setParams] = useSearchParams()
  const latest = useLatestBatch(spaceId).data ?? undefined
  const closed = useClosedBatches()
  const batch = latest && !closed.isClosed(latest.id) ? latest : undefined
  const tab: ArticlesTab = batch && params.get('tab') === 'recent' ? 'recent' : 'all'

  const setTab = (next: ArticlesTab) =>
    setParams(next === 'recent' ? { tab: 'recent' } : {}, { replace: true })
  const close = () => {
    if (batch) closed.close(batch.id)
    setTab('all')
  }

  return { batch, tab, setTab, close }
}
