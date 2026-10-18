import { Fragment } from 'react'
import type { ReactNode } from 'react'
import type { MentionedEntity } from '@/types'
import { inkFor, inkTint } from '@/design/inks'
import { typeName } from '../spaceText'

interface Props {
  content: string
  entities: MentionedEntity[]
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Longest names first, so a name inside a longer one doesn't split it.
function markEntities(paragraph: string, entities: MentionedEntity[]): ReactNode[] {
  if (entities.length === 0) return [paragraph]
  const byName = new Map(entities.map((e) => [e.name, e]))
  const names = [...byName.keys()].sort((a, b) => b.length - a.length).map(escapeRegExp)
  return paragraph.split(new RegExp(`(${names.join('|')})`, 'g')).map((part, i) => {
    const entity = byName.get(part)
    if (!entity) return <Fragment key={i}>{part}</Fragment>
    const ink = inkFor(entity.label)
    return (
      <mark
        key={i}
        title={typeName(entity.label)}
        className="bg-transparent text-inherit underline decoration-2 underline-offset-4"
        style={{ textDecorationColor: ink.color, backgroundColor: inkTint(ink, 8) }}
      >
        {part}
      </mark>
    )
  })
}

export function ArticleText({ content, entities }: Props) {
  const paragraphs = content
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)

  return (
    <div className="max-w-[65ch] space-y-5 font-serif text-[1.0625rem] leading-[1.75] text-fg-soft">
      {paragraphs.map((paragraph, i) => (
        <p key={i} className={i === 0 ? 'text-lg leading-[1.7] text-fg' : undefined}>
          {markEntities(paragraph, entities)}
        </p>
      ))}
    </div>
  )
}
