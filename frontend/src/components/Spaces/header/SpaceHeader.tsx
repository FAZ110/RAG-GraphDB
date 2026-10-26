import { surface } from '@/components/deck'
import type { Ink } from '@/design/inks'
import { useElementSize } from '@/hooks/useElementSize'
import { cn } from '@/lib/utils'
import type { Space } from '@/types'
import { ConstellationField } from '../map/ConstellationField'
import { ExploreCallout } from './ExploreCallout'
import { SpaceStatsStrip } from './SpaceStatsStrip'
import { SpaceTitle } from './SpaceTitle'

interface Props {
  space: Space
  ink: Ink
}

// The map is a square as tall as the sheet beside it, whose layout there doesn't depend on its
// width, so neither changes size when the space list comes and goes.
export function SpaceHeader({ space, ink }: Props) {
  const [sheetRef, sheet] = useElementSize<HTMLDivElement>()

  return (
    <div className="grid gap-6 beside-map:grid-cols-[auto_minmax(0,1fr)]">
      <div
        className={cn(surface, 'relative hidden beside-map:block')}
        style={{ backgroundColor: ink.field, width: sheet?.height }}
      >
        <ConstellationField spaceId={space.id} ink={ink} />
      </div>

      <div ref={sheetRef} className={cn(surface, '@container flex min-w-0 flex-col')}>
        <div className="px-5 pt-3 pb-2">
          <SpaceTitle key={space.id} space={space} />
        </div>
        <div className="hidden border-t border-line @md:block">
          <SpaceStatsStrip spaceId={space.id} />
        </div>
        <div className="mt-auto">
          <ExploreCallout spaceId={space.id} />
        </div>
      </div>
    </div>
  )
}
