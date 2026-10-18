import { HistoryIcon } from 'lucide-react'
import { IconButton } from '@/components/deck'

// Placeholder until explorations can be saved.
export function LastExploration() {
  return (
    <IconButton
      variant="inverse-outline"
      size="icon-xl"
      disabled
      label="Otwórz ostatnią eksplorację"
      title="Ostatnia eksploracja: nie zapisano jeszcze żadnej"
    >
      <HistoryIcon />
    </IconButton>
  )
}
