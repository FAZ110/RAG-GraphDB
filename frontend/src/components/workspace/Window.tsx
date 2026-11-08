import { motion, useDragControls, useMotionValue } from 'motion/react'
import { useRef } from 'react'
import type { ReactNode, RefObject } from 'react'
import { cn } from '@/lib/utils'
import type { Placement, Side } from './placement'
import { WindowChromeContext } from './windowChrome'

// How close to a side a window has to be let go to dock there.
const DOCK_REACH = 96

interface Props {
  side: Side
  width: number
  placement: Placement
  area: RefObject<HTMLDivElement | null>
  onDragZone: (side: Side | null | undefined) => void
  onPlace: (placement: Placement) => void
  children: ReactNode
}

/** A panel picked up by its title bar: let go at a side it docks there, elsewhere it stays put. */
export function Window({ side, width, placement, area, onDragZone, onPlace, children }: Props) {
  const controls = useDragControls()
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const self = useRef<HTMLDivElement>(null)
  const docked = 'dock' in placement
  const collapsed = placement.collapsed ?? false

  const sideAt = (clientX: number): Side | null => {
    const box = area.current!.getBoundingClientRect()
    if (clientX - box.left < DOCK_REACH) return 'left'
    if (box.right - clientX < DOCK_REACH) return 'right'
    return null
  }
  const looseHere = (): Placement => {
    const box = area.current!.getBoundingClientRect()
    const r = self.current!.getBoundingClientRect()
    return {
      x: Math.min(Math.max(r.left - box.left, 0), box.width - r.width),
      y: Math.min(Math.max(r.top - box.top, 0), box.height - 80),
    }
  }

  return (
    <motion.div
      ref={self}
      drag
      dragControls={controls}
      dragListener={false}
      dragMomentum={false}
      onDrag={(_, info) => onDragZone(sideAt(info.point.x - window.scrollX))}
      onDragEnd={(_, info) => {
        const dock = sideAt(info.point.x - window.scrollX)
        onDragZone(undefined)
        onPlace({ ...(dock ? { dock } : looseHere()), collapsed })
        x.set(0)
        y.set(0)
      }}
      style={{
        x,
        y,
        width,
        ...(docked
          ? {}
          : { left: placement.x, top: placement.y, maxHeight: `calc(100% - ${placement.y}px)` }),
      }}
      whileDrag={{ zIndex: 30 }}
      className={cn(
        'pointer-events-auto flex min-h-0',
        docked ? 'max-h-max grow basis-0' : 'absolute z-20 max-h-full'
      )}
    >
      <WindowChromeContext.Provider
        value={{
          grab: (e) => controls.start(e),
          docked,
          togglePin: () => onPlace({ ...(docked ? looseHere() : { dock: side }), collapsed }),
          collapsed,
          toggleCollapsed: () => onPlace({ ...placement, collapsed: !collapsed }),
        }}
      >
        {children}
      </WindowChromeContext.Provider>
    </motion.div>
  )
}
