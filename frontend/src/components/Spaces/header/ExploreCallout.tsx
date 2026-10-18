import { CompassIcon, NetworkIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/deck'
import { LastExploration } from './LastExploration'

export function ExploreCallout() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 bg-surface-inverse px-5 py-4">
      <div className="min-w-60 flex-1">
        <p className="text-lg font-bold text-fg-inverse">Eksploruj graf</p>
        <p className="hidden text-sm text-fg-inverse-muted @md:block">
          Wyszukaj encję i rozwijaj jej powiązania krok po kroku.
        </p>
      </div>
      <div className="flex items-center gap-3">
        <LastExploration />
        <Button asChild variant="inverse-outline" size="xl" className="px-4">
          <Link to="/graph">
            <NetworkIcon />
            Cały graf
          </Link>
        </Button>
        <Button variant="inverse" size="xl">
          <CompassIcon />
          Rozpocznij
        </Button>
      </div>
    </div>
  )
}
