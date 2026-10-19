import { useDeferredValue } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { searchEverywhere } from '../services/api'

/** Entities and articles across every space; idle until the query is two characters long. */
export function useGlobalSearch(query: string) {
  // Deferred, so fast typing doesn't send a request (and an embedding) per keystroke.
  const q = useDeferredValue(query.trim())
  return useQuery({
    queryKey: ['global-search', q],
    queryFn: () => searchEverywhere(q),
    enabled: q.length >= 2,
    placeholderData: keepPreviousData,
  })
}
