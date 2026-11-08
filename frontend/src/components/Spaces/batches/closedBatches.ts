import { storedValue } from '@/lib/storedValue'

// Uploads whose "recently added" tab the user closed.
const KEEP = 100

const closedBatches = storedValue<string[]>('atlas:closed-batches', [], {
  parse: (raw) => {
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : []
  },
  format: (ids) => JSON.stringify(ids),
})

function close(batchId: string) {
  const ids = closedBatches.get()
  if (!ids.includes(batchId)) closedBatches.set([...ids, batchId].slice(-KEEP))
}

export function useClosedBatches() {
  const ids = closedBatches.useValue()
  return { isClosed: (batchId: string) => ids.includes(batchId), close }
}
