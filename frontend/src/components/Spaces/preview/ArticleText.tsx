import type { ReactNode } from 'react'
import { inkFor, inkTint } from '@/design/inks'
import { typeName } from '../spaceText'
import { matchedEntity } from './entityMatch'
import type { EntityMatcher } from './entityMatch'

interface Props {
  content: string
  /** null leaves the text plain. */
  matcher: EntityMatcher | null
  highlighted: ReadonlySet<string>
  onHover: (name: string | null) => void
}

function markEntities(
  paragraph: string,
  matcher: EntityMatcher,
  highlighted: ReadonlySet<string>,
  onHover: (name: string | null) => void
): ReactNode[] {
  const parts: ReactNode[] = []
  let last = 0
  for (const match of paragraph.matchAll(matcher.pattern)) {
    const entity = matchedEntity(matcher, match)
    const at = match.index
    if (at > last) parts.push(paragraph.slice(last, at))
    const ink = inkFor(entity.label)
    const lit = highlighted.has(entity.name)
    const tint = lit ? 28 : highlighted.size > 0 ? 0 : 8
    parts.push(
      <mark
        key={at}
        data-entity={entity.name}
        title={`${entity.name} (${typeName(entity.label)})`}
        onMouseEnter={() => onHover(entity.name)}
        onMouseLeave={() => onHover(null)}
        className="bg-transparent text-inherit underline underline-offset-4 transition-colors"
        style={{
          textDecorationColor: ink.color,
          textDecorationThickness: lit ? 3 : 2,
          backgroundColor: tint ? inkTint(ink, tint) : 'transparent',
        }}
      >
        {match[0]}
      </mark>
    )
    last = at + match[0].length
  }
  parts.push(paragraph.slice(last))
  return parts
}

export function ArticleText({ content, matcher, highlighted, onHover }: Props) {
  const paragraphs = content
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)

  return (
    // Justified like print; hyphenation (Polish rules, hence `lang`) keeps the gaps even.
    <div
      lang="pl"
      className="max-w-[65ch] space-y-5 text-justify font-serif text-[1.0625rem] leading-[1.75] hyphens-auto text-fg-soft"
    >
      {paragraphs.map((paragraph, i) => (
        <p key={i} className={i === 0 ? 'text-lg leading-[1.7] text-fg' : undefined}>
          {matcher ? markEntities(paragraph, matcher, highlighted, onHover) : paragraph}
        </p>
      ))}
    </div>
  )
}
