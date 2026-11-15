import { normalize } from '@/lib/text'
import type { Article, Space } from '@/types'

export function filterSpaces(spaces: Space[], needle: string): Space[] {
  return needle ? spaces.filter((space) => normalize(space.name).includes(needle)) : spaces
}

/** `own` is the order the user dragged the spaces into, as the API returns them. */
export type SpaceSort = 'own' | 'articles' | 'entities'

/** Largest first; equal counts keep the user's own order. */
export function sortSpaces(spaces: Space[], sort: SpaceSort): Space[] {
  if (sort === 'own') return spaces
  const count = sort === 'articles' ? 'article_count' : 'entity_count'
  return [...spaces].sort((a, b) => b[count] - a[count])
}

export function filterArticles(articles: Article[], needle: string): Article[] {
  return needle
    ? articles.filter(
        (a) => normalize(a.title ?? '').includes(needle) || normalize(a.url ?? '').includes(needle)
      )
    : articles
}
