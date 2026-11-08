import type { ReactNode } from 'react'
import { inkFor, inkTint } from '@/design/inks'
import type { Span } from '@/types'
import { typeName } from '../spaceText'
import { matchedEntity } from './entityMatch'
import type { EntityMatcher } from './entityMatch'

interface Props {
  content: string
  /** null leaves the text plain. */
  matcher: EntityMatcher | null
  highlighted: ReadonlySet<string>
  onHover: (name: string | null) => void
  evidence: Span[]
}

function markEntities(
  text: string,
  base: number,
  matcher: EntityMatcher,
  highlighted: ReadonlySet<string>,
  onHover: (name: string | null) => void
): ReactNode[] {
  const parts: ReactNode[] = []
  let last = 0
  for (const match of text.matchAll(matcher.pattern)) {
    const entity = matchedEntity(matcher, match)
    const at = match.index
    if (at > last) parts.push(text.slice(last, at))
    const ink = inkFor(entity.label)
    const lit = highlighted.has(entity.name)
    const tint = lit ? 28 : highlighted.size > 0 ? 0 : 8
    parts.push(
      <mark
        key={base + at}
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
  parts.push(text.slice(last))
  return parts
}

function paragraphs(content: string): { text: string; start: number }[] {
  const out = []
  let cursor = 0
  for (const raw of content.split(/\n\s*\n/)) {
    const text = raw.trim()
    if (!text) continue
    const start = content.indexOf(text, cursor)
    out.push({ text, start })
    cursor = start + text.length
  }
  return out
}

export function ArticleText({ content, matcher, highlighted, onHover, evidence }: Props) {
  const plain = (text: string, base: number) =>
    matcher ? markEntities(text, base, matcher, highlighted, onHover) : [text]

  const render = (text: string, start: number) => {
    const parts: ReactNode[] = []
    let last = 0
    for (const [s, e] of evidence) {
      const a = Math.max(s - start, last)
      const b = Math.min(e - start, text.length)
      if (a >= b) continue
      parts.push(...plain(text.slice(last, a), last))
      parts.push(
        <mark
          key={`evidence-${a}`}
          data-evidence
          className="rounded-sm bg-amber-100 text-inherit box-decoration-clone transition-colors"
        >
          {plain(text.slice(a, b), a)}
        </mark>
      )
      last = b
    }
    parts.push(...plain(text.slice(last), last))
    return parts
  }

  return (
    // Justified like print; hyphenation (Polish rules, hence `lang`) keeps the gaps even.
    <div
      lang="pl"
      className="max-w-[65ch] space-y-5 text-justify font-serif text-[1.0625rem] leading-[1.75] hyphens-auto text-fg-soft"
    >
      {paragraphs(content).map(({ text, start }, i) => (
        <p key={i} className={i === 0 ? 'text-lg leading-[1.7] text-fg' : undefined}>
          {render(text, start)}
        </p>
      ))}
    </div>
  )
}
