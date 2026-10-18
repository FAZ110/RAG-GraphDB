import { normalize } from '@/lib/text'
import type { Article, Space } from '@/types'

export function filterSpaces(spaces: Space[], needle: string): Space[] {
  return needle ? spaces.filter((space) => normalize(space.name).includes(needle)) : spaces
}

export function filterArticles(articles: Article[], needle: string): Article[] {
  return needle
    ? articles.filter(
        (a) => normalize(a.title ?? '').includes(needle) || normalize(a.url ?? '').includes(needle)
      )
    : articles
}
