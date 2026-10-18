import { HistoryIcon } from 'lucide-react'
import { IconButton, Tooltip, focusRing } from '@/components/deck'
import { cn } from '@/lib/utils'

// Placeholder until analyses can be saved. The disabled button gets no pointer events, so the
// label hangs on a focusable wrapper.
export function LastExploration() {
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
