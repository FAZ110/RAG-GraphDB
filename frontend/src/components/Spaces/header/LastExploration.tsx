import { useQuery } from '@tanstack/react-query'
import { HistoryIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { IconButton, Tooltip, focusRing } from '@/components/deck'
import { cn } from '@/lib/utils'
import { fetchAnalyses } from '@/services/analyses'
import { formatDate } from '../spaceText'

// The disabled button gets no pointer events, so its label hangs on a focusable wrapper.
export function LastExploration({ spaceId }: { spaceId: string }) {
  const analyses = useQuery({
    queryKey: ['analyses', spaceId],
    queryFn: () => fetchAnalyses(spaceId),
  })
  const last = analyses.data?.[0]

  if (last) {
    return (
      <Tooltip
        content={
          <>
            <span className="block font-semibold">Ostatnia analiza</span>
            <span className="block text-fg-inverse-muted">
              {last.name}, {formatDate(last.updated_at)}
            </span>
          </>
        }
      >
        <IconButton
          asChild
          variant="inverse-outline"
          size="icon-xl"
          label={`Otwórz analizę ${last.name}`}
          title=""
        >
          <Link to={`/analyses/${spaceId}/${last.id}`}>
            <HistoryIcon />
          </Link>
        </IconButton>
      </Tooltip>
    )
  }
  return (
    <Tooltip
      content={
        <>
          <span className="block font-semibold">Ostatnia analiza</span>
          <span className="block text-fg-inverse-muted">Nie zapisano jeszcze żadnej</span>
        </>
      }
    >
      <span tabIndex={0} className={cn('inline-flex', focusRing)}>
        <IconButton
          variant="inverse-outline"
          size="icon-xl"
          disabled
          label="Ostatnia analiza, nie zapisano jeszcze żadnej"
          title=""
        >
          <HistoryIcon />
        </IconButton>
      </span>
    </Tooltip>
  )
}
