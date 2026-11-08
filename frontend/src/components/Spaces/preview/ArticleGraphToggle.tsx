import { ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import { focusRing } from '@/components/deck'
import { cn } from '@/lib/utils'
import type { ArticleRelationship, MentionedEntity } from '@/types'
import { ENTITY_FORMS, RELATIONSHIP_FORMS, pluralForm } from '../spaceText'

interface Props {
  entities: MentionedEntity[]
  relationships: ArticleRelationship[]
  open: boolean
  onOpenChange: (open: boolean) => void
  side: 'left' | 'below'
}

export function ArticleGraphToggle({ entities, relationships, open, onOpenChange, side }: Props) {
  if (entities.length === 0) {
    return (
      <p className="border-b border-line-soft bg-surface-sunken px-8 py-4 text-sm text-fg-subtle">
        Z tego artykułu nie wydobyto jeszcze encji.
      </p>
    )
  }

  const Chevron = side === 'below' ? ChevronDownIcon : open ? ChevronRightIcon : ChevronLeftIcon
  const chevron = (
    <Chevron
      className={cn(
        'size-4 shrink-0 text-fg-soft transition-transform spring-quick',
        side === 'below' && open && 'rotate-180'
      )}
      aria-hidden="true"
    />
  )

  return (
    <button
      type="button"
      aria-expanded={open}
      onClick={() => onOpenChange(!open)}
      className={cn(
        'flex w-full items-center gap-3 border-b border-line-soft bg-surface-sunken py-4 text-left text-sm hover:bg-line-soft/40 focus-visible:ring-inset',
        side === 'left' ? 'pr-8 pl-6' : 'px-8',
        focusRing
      )}
    >
      {side === 'left' && chevron}
      <span className="min-w-0 flex-1 font-semibold text-fg">
        {open ? 'Ukryj' : 'Pokaż'} encje i powiązania
      </span>
      <span className="shrink-0 text-fg-subtle tabular-nums">
        {entities.length} {pluralForm(entities.length, ENTITY_FORMS)}, {relationships.length}{' '}
        {pluralForm(relationships.length, RELATIONSHIP_FORMS)}
      </span>
      {side === 'below' && chevron}
    </button>
  )
}
