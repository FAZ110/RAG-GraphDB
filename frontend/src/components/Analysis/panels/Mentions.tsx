import { FileTextIcon } from 'lucide-react'
import { focusRing } from '@/components/deck'
import { inkFor } from '@/design/inks'
import { useNodeSources } from '@/hooks/useSpaces'
import { cn } from '@/lib/utils'
import type { LoadedNode } from '@/types'
import { MarkedNames } from './MarkedNames'
import { Section } from './Section'

const SHOWN = 3

interface Props {
  spaceId: string
  node: LoadedNode
  onOpenArticle: (articleId: string) => void
}

/** Where the articles mention the entity: each article, then the sentence with it marked. */
export function Mentions({ spaceId, node, onOpenArticle }: Props) {
  const sources = useNodeSources(spaceId, node.id)
  const names = [node.name, ...((node.properties.aliases as string[] | undefined) ?? [])]
  const count = sources.data?.length ?? 0

  return (
    <Section
      title="Wzmianki"
      aside={count > 0 && (count === 1 ? 'w 1 artykule' : `w ${count} artykułach`)}
    >
      {sources.isPending && <p className="px-3 pb-2 text-sm text-fg-subtle">Wczytuję…</p>}
      {sources.error && <p className="px-3 pb-2 text-sm text-danger">{sources.error.message}</p>}
      {sources.data?.length === 0 && (
        <p className="px-3 pb-2 text-sm text-fg-subtle">Dodana ręcznie, bez artykułów</p>
      )}
      <ul className="pb-1">
        {sources.data?.slice(0, SHOWN).map((s) => (
          <li key={s.article_id}>
            <button
              type="button"
              onClick={() => onOpenArticle(s.article_id)}
              className={cn('block w-full px-3 py-2 text-left hover:bg-surface-sunken', focusRing)}
            >
              <span className="flex items-center gap-1.5 text-xs font-medium text-fg-muted">
                <FileTextIcon className="size-3.5 shrink-0" aria-hidden="true" />
                <span className="truncate">{s.title || 'Artykuł bez tytułu'}</span>
              </span>
              {s.quotes[0] && (
                <span className="mt-1 line-clamp-3 text-sm leading-snug text-fg-soft">
                  <MarkedNames text={s.quotes[0]} names={names} color={inkFor(node.label).color} />
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>
      {count > SHOWN && (
        <p className="px-3 pb-2 text-xs text-fg-subtle">i w {count - SHOWN} kolejnych</p>
      )}
    </Section>
  )
}
