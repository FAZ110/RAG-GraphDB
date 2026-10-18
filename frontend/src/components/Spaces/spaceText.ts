export const SPACE_NAME_MAX_LENGTH = 100

const plural = new Intl.PluralRules('pl-PL')
const dateFormat = new Intl.DateTimeFormat('pl-PL', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

type Forms = Record<'one' | 'few' | 'many', string>

export const ARTICLE_FORMS: Forms = { one: 'artykuł', few: 'artykuły', many: 'artykułów' }
export const ENTITY_FORMS: Forms = { one: 'encja', few: 'encje', many: 'encji' }
export const RELATIONSHIP_FORMS: Forms = { one: 'powiązanie', few: 'powiązania', many: 'powiązań' }
export const TYPE_FORMS: Forms = { one: 'typ', few: 'typy', many: 'typów' }
export const SPACE_FORMS: Forms = { one: 'przestrzeń', few: 'przestrzenie', many: 'przestrzeni' }

export function pluralForm(count: number, forms: Forms): string {
  const form = plural.select(count)
  return form === 'one' || form === 'few' ? forms[form] : forms.many
}

export function formatDate(iso: string): string {
  return dateFormat.format(new Date(iso))
}

/** "ZAWODNIK" or "zawodnik" → "Zawodnik", as entity types read in sentence case. */
export function typeName(label: string): string {
  const lower = label.toLowerCase().replace(/_/g, ' ')
  return lower.charAt(0).toUpperCase() + lower.slice(1)
}
