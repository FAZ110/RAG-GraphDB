import { NetworkIcon, ScanSearchIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/deck'
import { LastExploration } from './LastExploration'

export function ExploreCallout({ spaceId }: { spaceId: string }) {
  return (
    // Beside the map it keeps to one row of the same height, so the header doesn't change
    // height with its width; the description shows only where it fits.
    <div className="@container flex flex-wrap items-center justify-between gap-x-4 gap-y-2 bg-surface-inverse px-5 py-3 beside-map:flex-nowrap">
      <div className="min-w-60 flex-1 beside-map:flex beside-map:min-h-12 beside-map:min-w-0 beside-map:flex-col beside-map:justify-center">
        <p className="text-lg font-bold text-fg-inverse">Graf przestrzeni</p>
        <p className="hidden text-sm text-fg-inverse-muted @md:block beside-map:hidden beside-map:truncate beside-map:@[50rem]:block">
          Zobacz pełny graf albo zbuduj własną analizę krok po kroku.
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <LastExploration />
        {/* On phones only its icon fits beside the other two. */}
        <Button
          asChild
          variant="inverse-outline"
          size="xl"
          className="px-4 max-sm:w-11 max-sm:px-0"
        >
          <Link to={`/graph/${spaceId}`} title="Cały graf">
            <NetworkIcon />
            <span className="max-sm:sr-only">Cały graf</span>
          </Link>
        </Button>
        <Button asChild variant="inverse" size="xl">
          <Link to={`/graph/${spaceId}`} state={{ explore: true }}>
            <ScanSearchIcon />
            Nowa analiza
          </Link>
        </Button>
      </div>
    </div>
  )
}
