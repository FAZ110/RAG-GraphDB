import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { refreshAfterUpload, useRunningBatches } from '@/hooks/useBatches'
import { openBatchEvents } from '@/services/api'

// On connecting the stream replays the results so far, so refreshes are bunched together.
const SETTLE_MS = 300

function BatchStream({ batchId }: { batchId: string }) {
  const queryClient = useQueryClient()

  useEffect(() => {
    const events = openBatchEvents(batchId)
    let timer: number | undefined
    const settle = () => {
      window.clearTimeout(timer)
      timer = window.setTimeout(() => refreshAfterUpload(queryClient), SETTLE_MS)
    }
    const end = () => {
      events.close()
      settle()
    }
    events.addEventListener('result', settle)
    events.addEventListener('done', end)
    // The server's own `error` event (an unknown job) is a message; a dropped connection is
    // a plain event, after which the browser reconnects by itself.
    events.addEventListener('error', (e) => e instanceof MessageEvent && end())
    return () => {
      events.close()
      window.clearTimeout(timer)
    }
  }, [batchId, queryClient])

  return null
}

/** Keeps uploads, articles and stats current while any upload runs, from its event stream. */
export function LiveBatches() {
  const running = useRunningBatches().data ?? []
  return running.map((batch) => <BatchStream key={batch.id} batchId={batch.id} />)
}
