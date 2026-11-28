import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { refreshAfterUpload, refreshProgress, useRunningBatches } from '@/hooks/useBatches'
import { openBatchEvents } from '@/services/api'

const PROGRESS_EVERY_MS = 10_000

function BatchStream({ batchId, spaceId }: { batchId: string; spaceId: string }) {
  const queryClient = useQueryClient()

  useEffect(() => {
    const events = openBatchEvents(batchId)
    let timer: number | undefined
    let ended = false
    const progress = () => {
      if (timer !== undefined) return
      timer = window.setTimeout(() => {
        timer = undefined
        refreshProgress(queryClient, spaceId)
      }, PROGRESS_EVERY_MS)
    }
    const end = () => {
      ended = true
      events.close()
      window.clearTimeout(timer)
      refreshAfterUpload(queryClient)
    }
    events.addEventListener('result', progress)
    events.addEventListener('done', end)
    // The server's own `error` event (an unknown job) is a message; a dropped connection is
    // a plain event, after which the browser reconnects by itself.
    events.addEventListener('error', (e) => e instanceof MessageEvent && end())
    return () => {
      events.close()
      window.clearTimeout(timer)
      if (!ended) refreshAfterUpload(queryClient)
    }
  }, [batchId, spaceId, queryClient])

  return null
}

/** Keeps uploads, articles and stats current while any upload runs, from its event stream. */
export function LiveBatches() {
  const running = useRunningBatches().data ?? []
  return running.map((batch) => (
    <BatchStream key={batch.id} batchId={batch.id} spaceId={batch.space_id} />
  ))
}
