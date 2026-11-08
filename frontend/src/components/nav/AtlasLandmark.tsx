import { cn } from '@/lib/utils'
import { AtlasMark } from './AtlasMark'

interface Props {
  /** Where it sits and how big it is; size the mark through `[&_svg]:size-…`. */
  className: string
  /** The page colour behind it, which hides the map's lines under the mark. */
  ground: string
  /** The mark's own colour and opacity. */
  tint: string
}

/**
 * The Atlas mark laid large over a contour map. A blurred copy in the page's colour sits under
 * it, so the lines fade out as they reach the mark instead of showing through it.
 */
export function AtlasLandmark({ className, ground, tint }: Props) {
  return (
    <div aria-hidden="true" className={cn('pointer-events-none absolute', className)}>
      <div className="absolute inset-0 blur-[3vh]" style={{ color: ground }}>
        <AtlasMark />
      </div>
      <div className={cn('relative', tint)}>
        <AtlasMark />
      </div>
    </div>
  )
}
