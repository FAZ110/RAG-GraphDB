import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { RemoveControl, Swatch, focusRing } from '@/components/deck'
import { ENTITY_FORMS, formatDate, pluralForm, typeName } from '@/components/Spaces/spaceText'
import { inkFor } from '@/design/inks'
import { cn } from '@/lib/utils'
import { deleteAnalysis } from '@/services/analyses'
import type { AnalysisListItem } from '@/types/analysis'
import { CARD_HEIGHT } from './cardSize'
import { TypeStrip } from './TypeStrip'

interface Props {
  analysis: AnalysisListItem
  /** Held in a drag: raised high off the page. */
  lifted?: boolean
  /** The grip a card is moved by, beside its remove button. */
  handle?: ReactNode
}

export function AnalysisCard({ analysis, lifted = false, handle }: Props) {
  const queryClient = useQueryClient()
  const remove = useMutation({
    mutationFn: () => deleteAnalysis(analysis.space_id, analysis.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['analyses'] }),
  })
  const count = analysis.entity_count

  return (
    <div
      className={cn(
        'group deck-lift relative flex flex-col border border-line bg-surface',
        CARD_HEIGHT,
        lifted && '[--lift-rest:var(--deck-offset-lg)] [--deck-shadow:var(--fg-muted)]'
      )}
    >
      <Link
        to={`/analyses/${analysis.space_id}/${analysis.id}`}
        className={cn('flex flex-1 flex-col gap-3 p-4 pr-20', focusRing)}
      >
        <span className="flex items-center gap-1.5 text-xs text-fg-subtle">
          <Swatch color={inkFor(analysis.space_id).color} />
          <span className="truncate">{analysis.space_name}</span>
        </span>
        <span className="line-clamp-2 text-heading text-fg">{analysis.name}</span>
        <span className="mt-auto flex flex-col gap-2">
          <TypeStrip labels={analysis.labels} total={count} />
          <span className="truncate text-xs text-fg-subtle">
            {count} {pluralForm(count, ENTITY_FORMS)}
            {analysis.labels[0] &&
              `, najwięcej: ${typeName(analysis.labels[0].label).toLowerCase()}`}
            {' · '}
            {formatDate(analysis.updated_at)}
          </span>
        </span>
      </Link>
      <RemoveControl
        label={`Usuń analizę ${analysis.name}`}
        question="Usunąć tę analizę?"
        detail="Encje i artykuły zostaną w przestrzeni, zniknie tylko to płótno."
        pending={remove.isPending}
        error={remove.error?.message ?? null}
        onOpen={remove.reset}
        onConfirm={(done) => remove.mutate(undefined, { onSuccess: done })}
        leading={handle}
        groupClassName="absolute top-2 right-2 flex items-center"
      />
    </div>
  )
}
