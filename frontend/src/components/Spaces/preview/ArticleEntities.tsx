import { Swatch } from '@/components/deck'
import { inkFor } from '@/design/inks'
import type { MentionedEntity } from '@/types'
import { typeName } from '../spaceText'

interface Props {
  entities: MentionedEntity[]
}

export function ArticleEntities({ entities }: Props) {
  if (entities.length === 0) {
    return <p className="text-sm text-fg-subtle">Z tego artykułu nie wydobyto jeszcze encji.</p>
  }
  return (
    <ul className="flex flex-wrap gap-2">
      {entities.map((e) => (
        <li
          key={`${e.label}:${e.name}`}
          title={typeName(e.label)}
          className="flex items-center gap-2 border border-line-soft bg-surface px-2.5 py-1 text-sm text-fg-soft"
        >
          <Swatch color={inkFor(e.label).color} />
          {e.name}
        </li>
      ))}
    </ul>
  )
}
