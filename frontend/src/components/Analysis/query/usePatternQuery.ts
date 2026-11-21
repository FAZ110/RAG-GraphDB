import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { SPACES_QUERY_KEY } from '@/hooks/useSpaces'
import { fetchSpaceSchema, runQuery } from '@/services/analyses'
import type { LoadedNode } from '@/types'
import type { QueryBody } from '@/types/query'
import { loaded, mergePages } from './pages'
import type { Pattern } from './pattern'
import { problem, startPattern, toBody } from './pattern'

// Matches asked for at a time; the next page comes as the list is scrolled to its end.
const PAGE = 50
// Long enough to type a number or a name before the question goes out.
const SETTLE_MS = 300

/** Where answers come from: the whole space, or only the analysis's own entities. */
export type QueryScope = 'space' | 'analysis'

/**
 * The question being drawn, the space's schema to draw it with, and its live answer.
 * `canvas`: the entities of the analysis it is asked from, which it can be kept to.
 */
export function usePatternQuery(spaceId: string, canvas?: readonly string[]) {
  const [pattern, setPattern] = useState<Pattern | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [scope, setScope] = useState<QueryScope>('space')
  const issue = pattern ? problem(pattern) : null
  const within = scope === 'analysis' && canvas ? { within: [...canvas].sort() } : {}
  const question = pattern && !issue ? JSON.stringify({ ...toBody(pattern), ...within }) : null
  const [settled, setSettled] = useState<string | null>(null)
  // The last question asked, back when the modal opens again with nothing selected.
  const last = useRef<Pattern | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => setSettled(question), SETTLE_MS)
    return () => clearTimeout(timer)
  }, [question])

  const schema = useQuery({
    queryKey: [...SPACES_QUERY_KEY, spaceId, 'schema'],
    queryFn: () => fetchSpaceSchema(spaceId),
    enabled: pattern !== null,
    staleTime: 60_000,
  })
  // The answer a page at a time, the next one loaded as the list is scrolled to its end.
  const result = useInfiniteQuery({
    queryKey: [...SPACES_QUERY_KEY, spaceId, 'query', settled],
    queryFn: ({ pageParam }) =>
      runQuery(spaceId, { ...(JSON.parse(settled!) as QueryBody), skip: pageParam, limit: PAGE }),
    initialPageParam: 0,
    getNextPageParam: (last, pages) => (loaded(pages) < last.total ? loaded(pages) : undefined),
    enabled: settled !== null && settled === question,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    retry: false,
  })
  const answer = result.data ? mergePages(result.data.pages) : undefined

  return {
    pattern,
    selected,
    /** Null where there is no analysis to keep the answers to. */
    scope: canvas ? scope : null,
    /** How many entities the analysis holds, which a question kept to it searches. */
    canvasSize: canvas?.length,
    setScope,
    issue,
    schema: schema.data,
    result: question ? { data: answer, error: result.error } : null,
    /** Waiting for the user to stop typing, or for the answer; not for a further page. */
    pending:
      question !== null &&
      (question !== settled || (result.isFetching && !result.isFetchingNextPage)),
    /** The next page of the answer, while there is one. */
    more: {
      has: result.hasNextPage,
      loading: result.isFetchingNextPage,
      load: () => void result.fetchNextPage(),
    },
    open: (entities: readonly LoadedNode[]) => {
      if (entities.length === 0 && last.current) {
        setPattern(last.current)
        setSelected(null)
        return
      }
      // Opens on the question and its answer; settings open when a part is clicked.
      setPattern(startPattern(entities))
      setSelected(null)
    },
    close: () => {
      last.current = pattern
      setPattern(null)
      setSelected(null)
    },
    change: (next: Pattern, select?: string | null) => {
      setPattern(next)
      if (select !== undefined) setSelected(select)
      else if (selected && ![...next.nodes, ...next.edges].some((x) => x.key === selected))
        setSelected(null)
    },
    select: setSelected,
  }
}

export type PatternQuery = ReturnType<typeof usePatternQuery>
