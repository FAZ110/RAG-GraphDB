import { pluralForm } from '../spaceText'

const WORDS_PER_MINUTE = 200
const CHAR_FORMS = { one: 'znak', few: 'znaki', many: 'znaków' }
const WORD_FORMS = { one: 'słowo', few: 'słowa', many: 'słów' }

const count = (n: number, forms: Parameters<typeof pluralForm>[1]) =>
  `${n.toLocaleString('pl-PL')} ${pluralForm(n, forms)}`

export const charCount = (content: string) => count(content.length, CHAR_FORMS)

/** How long the text is, in words and reading time. */
export function lengthFacts(content: string): string {
  const words = content.split(/\s+/).filter(Boolean).length
  const minutes = Math.max(1, Math.round(words / WORDS_PER_MINUTE))
  return `${count(words, WORD_FORMS)}, ${minutes} min`
}
