import { useState } from 'react'
import { useReorderSpaces } from '@/hooks/useSpaces'
import type { Space } from '@/types'

export function useSpaceOrder(shown: Space[]) {
  const reorder = useReorderSpaces()
  const [order, setOrder] = useState<string[] | null>(null)
  const [dragging, setDragging] = useState(false)

  const drop = () => {
    setDragging(false)
    if (order?.some((id, i) => id !== shown[i]?.id)) {
      reorder.mutate(order, { onSettled: () => setOrder(null) })
    } else {
      setOrder(null)
    }
  }

  return {
    ordered: order ? order.flatMap((id) => shown.filter((s) => s.id === id)) : shown,
    onReorder: setOrder,
    onDragStart: () => setDragging(true),
    onDrop: drop,
    // Only changes mid-drag, so other list changes don't animate.
    layoutKey: dragging || order ? (order?.join() ?? 'drag') : 'still',
  }
}
