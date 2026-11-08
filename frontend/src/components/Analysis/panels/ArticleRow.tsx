import { FilePlus2Icon, FileTextIcon } from 'lucide-react'
import { IconButton, focusRing } from '@/components/deck'
import { ENTITY_FORMS, pluralForm } from '@/components/Spaces/spaceText'
import { inkFor } from '@/design/inks'
import { cn } from '@/lib/utils'
import type { SourceArticle } from '@/types/analysis'

// More than this and the dots stop reading as single entities.
const DOTS = 12

interface Props {
  article: SourceArticle
  /** The type of each entity on the canvas, to colour its dot as on the canvas. */
  labelOf: (id: string) => string | undefined
  onHover: (article: SourceArticle | null) => void
  onOpen: () => void
  onAddEntities: () => void
}

/** An article as a page: its title, and a dot for each of its entities on the canvas. */
export function ArticleRow({ article, labelOf, onHover, onOpen, onAddEntities }: Props) {
  const labels = article.entity_ids
    .map(labelOf)
    .filter((l): l is string => l !== undefined)
    .toSorted()
  const count = article.entity_ids.length

  return (
    <li className="group relative flex items-start" onMouseEnter={() => onHover(article)}>
      <button
        type="button"
        onClick={onOpen}
        onFocus={() => onHover(article)}
        onBlur={() => onHover(null)}
        title={article.title ?? undefined}
        className={cn(
          'flex min-w-0 flex-1 gap-2 px-3 py-1.5 text-left hover:bg-surface-sunken',
          focusRing
        )}
      >
        <FileTextIcon className="mt-0.5 size-3.5 shrink-0 text-fg-subtle" aria-hidden="true" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-fg">
            {article.title || 'Artykuł bez tytułu'}
          </span>
          {/* A dot per entity of it on the canvas, in its type's ink, then how many. */}
          <span className="mt-1 flex items-center gap-1">
            {labels.slice(0, DOTS).map((label, i) => (
              <span
                key={i}
                aria-hidden="true"
                className="size-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: inkFor(label).color }}
              />
            ))}
            <span className="ml-1 text-xs text-fg-subtle tabular-nums">
              {labels.length > DOTS && `+${labels.length - DOTS} · `}
              {count} {pluralForm(count, ENTITY_FORMS)}
            </span>
          </span>
        </span>
      </button>
      <IconButton
        variant="ghost"
        size="icon-sm"
        label="Pokaż pozostałe encje z artykułu"
        onClick={onAddEntities}
        className="mt-1 mr-1 size-7 opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
      >
        <FilePlus2Icon />
      </IconButton>
    </li>
  )
}
