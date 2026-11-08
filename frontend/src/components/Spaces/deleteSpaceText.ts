import type { Space } from '@/types'
import { ARTICLE_FORMS, ENTITY_FORMS, pluralForm } from './spaceText'

export const deleteSpaceQuestion = (space: Space) => `Usunąć „${space.name}”?`

export function deleteSpaceDetail(space: Space) {
  const { article_count: articles, entity_count: entities } = space
  if (articles === 0) return 'Tego nie da się cofnąć.'
  const what = `${articles} ${pluralForm(articles, ARTICLE_FORMS)} i ${entities} ${pluralForm(entities, ENTITY_FORMS)}`
  return `Razem z nią usuniesz ${what}. Tego nie da się cofnąć.`
}
