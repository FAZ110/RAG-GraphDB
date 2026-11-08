import type { MentionedEntity } from '@/types'

export interface EntityMatcher {
  pattern: RegExp
  /** The entity behind each capture group, in group order. */
  entities: MentionedEntity[]
}

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// Polish inflects names ("Gdańsk", "w Gdańsku"), so longer words match by their stem with
// any ending; short ones ("w", "PAN") must match whole.
function wordPattern(word: string): string {
  if (!/^\p{L}+$/u.test(word) || word.length <= 3) return `${escapeRegExp(word)}(?![\\p{L}\\p{N}])`
  return `${escapeRegExp(word.slice(0, word.length >= 6 ? -2 : -1))}\\p{L}*`
}

function namePattern(name: string): string {
  return name
    .split(/([\s-]+)/)
    .map((part, i) => (i % 2 ? (part.includes('-') ? '\\s*-\\s*' : '\\s+') : wordPattern(part)))
    .join('')
}

export function entityMatcher(entities: MentionedEntity[]): EntityMatcher | null {
  if (entities.length === 0) return null
  // Longest names first, so a name inside a longer one doesn't split it.
  const ordered = [...entities].sort((a, b) => b.name.length - a.name.length)
  const groups = ordered.map((e) => `(${namePattern(e.name)})`).join('|')
  return { pattern: new RegExp(`(?<![\\p{L}\\p{N}])(?:${groups})`, 'giu'), entities: ordered }
}

export function matchedEntity(matcher: EntityMatcher, match: RegExpMatchArray): MentionedEntity {
  return matcher.entities[match.slice(1).findIndex((group) => group !== undefined)]
}

export function namesInText(content: string, matcher: EntityMatcher | null): Set<string> {
  if (!matcher) return new Set()
  return new Set([...content.matchAll(matcher.pattern)].map((m) => matchedEntity(matcher, m).name))
}
