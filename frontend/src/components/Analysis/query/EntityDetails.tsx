import { ArrowLeftIcon } from 'lucide-react'
import { Button, Swatch } from '@/components/deck'
import { Mentions } from '@/components/Analysis/panels/Mentions'
import { Section } from '@/components/Analysis/panels/Section'
import { pluralForm, RELATIONSHIP_FORMS, typeName } from '@/components/Spaces/spaceText'
import { inkFor } from '@/design/inks'
import type { LoadedNode } from '@/types'
import type { Tie } from './links'
import { TieDiagram } from './TieDiagram'

/** An extracted description, which comes as a bare phrase, set as a sentence. */
function asSentence(text: unknown): string | null {
  if (typeof text !== 'string' || !text.trim()) return null
  const t = text.trim()
  return t.charAt(0).toUpperCase() + t.slice(1) + (/[.!?…]$/.test(t) ? '' : '.')
}

interface Props {
  spaceId: string
  entity: LoadedNode
  /** How the entity fits the question: who it is tied to, and by what. */
  ties: readonly Tie[]
  onBack: () => void
  onOpenArticle: (articleId: string) => void
}

/** One result up close: what the entity is, why it answers, and where the articles mention it. */
export function EntityDetails({ spaceId, entity, ties, onBack, onOpenArticle }: Props) {
  const description = asSentence(entity.properties.description)
  const aliases = (entity.properties.aliases as string[] | undefined) ?? []

  return (
    <div className="flex flex-col">
      <div className="border-b border-line px-3 py-2">
        <Button size="sm" variant="ghost" onClick={onBack} autoFocus>
          <ArrowLeftIcon />
          Wszystkie wyniki
        </Button>
      </div>
      <div className="px-5 pt-4 pb-4">
        <p className="flex items-center gap-2 text-xs text-fg-subtle">
          <Swatch color={inkFor(entity.label).color} className="size-2" />
          {typeName(entity.label)}
          {entity.degree > 0 &&
            ` · ${entity.degree} ${pluralForm(entity.degree, RELATIONSHIP_FORMS)} w grafie`}
        </p>
        <p className="mt-1 text-heading text-fg">{entity.name}</p>
        {aliases.length > 0 && (
          <p className="mt-0.5 text-xs text-fg-subtle">także: {aliases.join(', ')}</p>
        )}
        {description && (
          <p className="mt-2 text-[15px] leading-relaxed text-fg-soft">{description}</p>
        )}
      </div>
      <div className="px-2 pb-2">
        {ties.length > 0 && (
          <Section title="Dlaczego jest w wynikach">
            <div className="px-3 pt-1 pb-3">
              <TieDiagram root={entity} ties={ties} />
            </div>
          </Section>
        )}
        <Mentions spaceId={spaceId} node={entity} onOpenArticle={onOpenArticle} />
      </div>
    </div>
  )
}
