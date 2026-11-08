import { useRef, useState } from 'react'
import type { CSSProperties, ReactNode, RefObject } from 'react'
import { cn } from '@/lib/utils'
import { place, usePlacements } from './placement'
import type { Side } from './placement'
import { Window } from './Window'

export interface WindowSpec {
  id: string
  /** Where it docks until moved, and where pinning sends it back. */
  side: Side
  width: number
  /** Null hides the window, keeping where it was left for when it comes back. */
  content: ReactNode | null
}

interface Props {
  windows: WindowSpec[]
  /** The docked columns, for measuring what they cover. */
  leftRef: RefObject<HTMLDivElement | null>
  rightRef: RefObject<HTMLDivElement | null>
  className?: string
  style?: CSSProperties
}

/** Panels over the canvas as windows: docked in a column at either side, or loose anywhere. */
export function WindowLayer({ windows, leftRef, rightRef, className, style }: Props) {
  const area = useRef<HTMLDivElement>(null)
  const placements = usePlacements()
  // undefined while nothing is being moved; null while one is, away from either side.
  const [zone, setZone] = useState<Side | null | undefined>(undefined)
  const shown = windows
    .filter((w) => w.content !== null)
    .map((w) => ({ ...w, placement: placements[w.id] ?? { dock: w.side } }))

  const render = (w: (typeof shown)[number]) => (
    <Window
      key={w.id}
      side={w.side}
      width={w.width}
      placement={w.placement}
      area={area}
      onDragZone={setZone}
      onPlace={(p) => place(w.id, p)}
    >
      {w.content}
    </Window>
  )
  const column = (side: Side) =>
    shown.filter((w) => 'dock' in w.placement && w.placement.dock === side).map(render)

  return (
    <div ref={area} style={style} className={cn('pointer-events-none relative', className)}>
      {/* Where a window let go now would dock, shown only while one is moving. */}
      {zone !== undefined &&
        (['left', 'right'] as const).map((side) => (
          <div
            key={side}
            aria-hidden="true"
            className={cn(
              'absolute inset-y-0 w-80 border-2 border-dashed transition-colors',
              side === 'left' ? 'left-0' : 'right-0',
              zone === side ? 'border-fg-subtle bg-surface/50' : 'border-line/60'
            )}
          />
        ))}
      <div ref={leftRef} className="absolute inset-y-0 left-0 flex flex-col items-start gap-3">
        {column('left')}
      </div>
      <div ref={rightRef} className="absolute inset-y-0 right-0 flex flex-col items-end gap-3">
        {column('right')}
      </div>
      {shown.filter((w) => !('dock' in w.placement)).map(render)}
    </div>
  )
}
