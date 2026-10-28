import { motion, useDragControls } from 'motion/react'
import { GripVerticalIcon } from 'lucide-react'
import { useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { IconButton } from '@/components/deck'
import { dragSettle, move } from '@/design/motion'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import type { AnalysisListItem } from '@/types/analysis'
import { AnalysisCard } from './AnalysisCard'
import { useAnalysisOrder } from './useAnalysisOrder'

interface Props {
  all: AnalysisListItem[]
  shown: AnalysisListItem[]
  /** Sits in the first slot and stays there, e.g. the sketch of a new analysis. */
  leading?: ReactNode
}

interface ItemProps {
  analysis: AnalysisListItem
  draggable: boolean
  held: boolean
  onPickUp: () => void
  onMove: (x: number, y: number) => void
  onDrop: () => void
  register: (el: HTMLElement | null) => void
}

function DraggableCard({
  analysis,
  draggable,
  held,
  onPickUp,
  onMove,
  onDrop,
  register,
}: ItemProps) {
  const controls = useDragControls()
  return (
    <motion.li
      ref={register}
      layout
      transition={move.base}
      drag={draggable}
      dragControls={controls}
      // Only the grip starts a drag, so the rest of the card stays a link.
      dragListener={false}
      dragSnapToOrigin
      dragMomentum={false}
      dragTransition={dragSettle}
      onDragStart={onPickUp}
      onDrag={(_, info) => onMove(info.point.x - window.scrollX, info.point.y - window.scrollY)}
      onDragEnd={onDrop}
      className={held ? 'relative z-10' : 'relative'}
    >
      <AnalysisCard
        analysis={analysis}
        lifted={held}
        handle={
          draggable && (
            <IconButton
              variant="ghost"
              size="icon-sm"
              label="Przeciągnij, by zmienić kolejność"
              onPointerDown={(e) => controls.start(e)}
              className={
                held ? 'cursor-grabbing touch-none text-fg' : 'cursor-grab touch-none text-fg-faint'
              }
            >
              <GripVerticalIcon />
            </IconButton>
          )
        }
      />
    </motion.li>
  )
}

/** Analyses as cards on the page, moved by their grip into a new order. */
export function AnalysisGrid({ all, shown, leading }: Props) {
  const order = useAnalysisOrder(all, shown)
  const [held, setHeld] = useState<string | null>(null)
  const grid = useRef<HTMLUListElement>(null)
  const cards = useRef(new Map<string, HTMLElement>())
  // On touch, dragging would take over scrolling the page.
  const draggable = useMediaQuery('(pointer: fine)')

  // Slots come from the grid's layout, not the cards' animated boxes, so a card sliding out of
  // the way never passes under the pointer and swaps back.
  const slotAt = (id: string, x: number, y: number) => {
    const origin = grid.current!.getBoundingClientRect()
    const px = x - origin.left
    const py = y - origin.top
    for (const [other, el] of cards.current) {
      if (other === id) continue
      const inside =
        px >= el.offsetLeft &&
        px <= el.offsetLeft + el.offsetWidth &&
        py >= el.offsetTop &&
        py <= el.offsetTop + el.offsetHeight
      if (inside) return other
    }
    return null
  }

  return (
    <ul ref={grid} className="relative grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {leading && <li>{leading}</li>}
      {order.ordered.map((a) => (
        <DraggableCard
          key={a.id}
          analysis={a}
          draggable={draggable}
          held={held === a.id}
          onPickUp={() => setHeld(a.id)}
          onMove={(x, y) => {
            const target = slotAt(a.id, x, y)
            if (target) order.moveTo(a.id, target)
          }}
          onDrop={() => {
            setHeld(null)
            order.drop()
          }}
          register={(el) => {
            if (el) cards.current.set(a.id, el)
            else cards.current.delete(a.id)
          }}
        />
      ))}
    </ul>
  )
}
