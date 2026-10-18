import { surface } from '@/components/deck'
import type { Ink } from '@/design/inks'
import { useElementSize } from '@/hooks/useElementSize'
import { cn } from '@/lib/utils'
import type { Space } from '@/types'
import { ConstellationField } from '../map/ConstellationField'
import { formatDate } from '../spaceText'
import { ExploreCallout } from './ExploreCallout'
import { SpaceStatsStrip } from './SpaceStatsStrip'
import { SpaceTitle } from './SpaceTitle'

interface Props {
  space: Space
  ink: Ink
}

// The map is a square as tall as the sheet, so its width comes from the sheet's height.
export function SpaceHeader({ space, ink }: Props) {
  const [sheetRef, sheet] = useElementSize<HTMLDivElement>()

  return (
    <div className="grid gap-6 min-[88rem]:[@media(min-height:50rem)]:grid-cols-[auto_minmax(0,1fr)]">
      <div
        className={cn(surface, 'relative hidden min-[88rem]:[@media(min-height:50rem)]:block')}
        style={{ backgroundColor: ink.field, width: sheet?.height }}
      >
        <ConstellationField spaceId={space.id} ink={ink} map fill animated />
      </div>

      <div ref={sheetRef} className={cn(surface, '@container flex min-w-0 flex-col')}>
        <div className="px-5 pt-4 pb-3">
          <SpaceTitle key={space.id} space={space} />
          <p className="text-sm text-fg-subtle">Utworzona {formatDate(space.created_at)}</p>
        </div>
        <div className="hidden border-t border-line @md:block">
          <SpaceStatsStrip spaceId={space.id} />
        </div>
        <div className="mt-auto">
          <ExploreCallout />
        </div>
      </div>
    </div>
  )
}
