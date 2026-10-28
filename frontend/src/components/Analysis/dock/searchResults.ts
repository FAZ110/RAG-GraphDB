import { useQuery } from '@tanstack/react-query'
import { useDeferredValue } from 'react'
import { sourceHost } from '@/components/Spaces/articles/articleSource'
import { typeName } from '@/components/Spaces/spaceText'
import { useSpaceArticles, useSpaceStats } from '@/hooks/useSpaces'
import { normalize } from '@/lib/text'
import { fetchEntitiesOfType } from '@/services/analyses'
import { fetchGraphSeed, fetchSimilarNodes } from '@/services/api'

export type SearchHit =
  | { kind: 'entity'; id: string; name: string; label: string; degree?: number }
  | {
      kind: 'article'
      id: string
      name: string
      source: string
      entities: number | null
      /** How many of its entities are on the canvas already. */
      placed: number
    }
  | { kind: 'type'; id: string; name: string; count: number }

export type SearchScope = 'all' | 'entity' | 'article' | 'type'

export const SCOPES: { scope: SearchScope; name: string }[] = [
  { scope: 'all', name: 'Wszystko' },
  { scope: 'entity', name: 'Encje' },
  { scope: 'article', name: 'Artykuły' },
  { scope: 'type', name: 'Typy' },
]

export interface SearchSection {
  key: string
  title: string
  hits: SearchHit[]
  /** The tab that lists the whole of a section only previewed here, and how many it holds. */
  more?: { scope: SearchScope; count: number }
}

// How much of each kind the overview previews; its own tab lists all of it.
const PREVIEW = { entity: 5, article: 4, type: 5 }
const SIMILAR = 8
const MIN_QUERY = 2
const POOL = 500

/**
 * What the dock lists, to browse rather than recall: every article newest first, every entity
 * best connected first (of one type if picked), every type; typing narrows them by name, and
 * entities also by meaning. The overview previews each kind and links to the whole of it.
 */
export function useSearchSections(
  spaceId: string,
  query: string,
  scope: SearchScope,
  label: string | null,
  onCanvas: (id: string) => boolean,
  placedOf: (articleId: string) => number,
  hideAdded: boolean
) {
  const deferred = useDeferredValue(query.trim())
  const typed = deferred.length >= MIN_QUERY
  const needle = normalize(deferred)
  const matches = (name: string) => !needle || normalize(name).includes(needle)
  const wants = (s: SearchScope) => scope === 'all' || scope === s

  const pool = useQuery({
    queryKey: ['analysis', spaceId, 'entities', label],
    queryFn: async () =>
      label
        ? (await fetchEntitiesOfType(spaceId, label, POOL)).nodes
        : (await fetchGraphSeed(spaceId, POOL)).nodes,
    enabled: wants('entity'),
    staleTime: 60_000,
  })
  const similar = useQuery({
    queryKey: ['analysis', spaceId, 'search', deferred],
    queryFn: () => fetchSimilarNodes(spaceId, deferred, SIMILAR),
    enabled: typed && wants('entity'),
    staleTime: 60_000,
  })
  const articles = useSpaceArticles(spaceId)
  const stats = useSpaceStats(spaceId)

  const named = (pool.data ?? []).filter((n) => matches(n.name))
  const added = named.filter((n) => onCanvas(n.id)).length
  const entities: SearchHit[] = named
    .filter((n) => !hideAdded || !onCanvas(n.id))
    // What could still be added comes first; what is already on the canvas trails behind.
    .toSorted((a, b) => Number(onCanvas(a.id)) - Number(onCanvas(b.id)) || b.degree - a.degree)
    .map((n) => ({ kind: 'entity', id: n.id, name: n.name, label: n.label, degree: n.degree }))
  const listed = new Set(entities.map((e) => e.id))
  const alike: SearchHit[] = (similar.data ?? [])
    .filter((e) => !listed.has(e.id) && (!label || e.label === label))
    .filter((e) => !hideAdded || !onCanvas(e.id))
    .map((e) => ({ kind: 'entity', ...e }))
  // An article counts as added once all its entities are on the canvas.
  const whole = (a: { id: string; nodes_count: number | null }) =>
    a.nodes_count !== null && a.nodes_count > 0 && placedOf(a.id) >= a.nodes_count
  const readable = (articles.data ?? []).filter(
    (a) => a.status === 'ok' && a.title && matches(a.title)
  )
  const addedArticles = readable.filter(whole).length
  const articleHits: SearchHit[] = readable
    .filter((a) => !hideAdded || !whole(a))
    .toSorted(
      (a, b) => Number(whole(a)) - Number(whole(b)) || b.created_at.localeCompare(a.created_at)
    )
    .map((a) => ({
      kind: 'article',
      id: a.id,
      name: a.title!,
      source: sourceHost(a.url),
      entities: a.nodes_count,
      placed: placedOf(a.id),
    }))
  const types: SearchHit[] = (stats.data?.entities.by_label ?? [])
    .filter((t) => matches(typeName(t.label)))
    .toSorted((a, b) => b.count - a.count)
    .map((t) => ({ kind: 'type', id: t.label, name: typeName(t.label), count: t.count }))

  const all = (key: string, title: string, hits: SearchHit[]): SearchSection => ({
    key,
    title,
    hits,
  })
  const preview = (key: SearchHit['kind'], title: string, hits: SearchHit[]): SearchSection => ({
    key,
    title,
    hits: hits.slice(0, PREVIEW[key]),
    more: hits.length > PREVIEW[key] ? { scope: key, count: hits.length } : undefined,
  })

  const sections: SearchSection[] =
    scope === 'all'
      ? [
          preview('article', 'Artykuły', articleHits),
          preview('entity', 'Encje', entities),
          preview('type', 'Typy', types),
        ]
      : scope === 'article'
        ? [all('article', 'Od najnowszych', articleHits)]
        : scope === 'type'
          ? [all('type', 'Od największych', types)]
          : [
              all('entity', typed ? 'Po nazwie' : 'Od najbardziej powiązanych', entities),
              all('similar', 'Podobne znaczeniowo', alike),
            ]

  return {
    sections: sections.filter((s) => s.hits.length > 0),
    needle,
    typed,
    labels: stats.data?.entities.by_label ?? [],
    /** How many of what this tab lists, matching the query, is on the canvas already. */
    added: (scope === 'article' ? 0 : added) + (scope === 'entity' ? 0 : addedArticles),
    loading: wants('entity') && pool.isPending,
    error: pool.error ?? similar.error,
  }
}
