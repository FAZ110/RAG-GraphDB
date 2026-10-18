import { fitRowHeight } from '../fitRows'

// Shortest items, including their 1px bottom border.
const ITEM_HEIGHT = 57
const WIDE_ITEM_HEIGHT = 72
// Beyond this the spare room goes to the new-space tile instead.
const MAX_STRETCH = 1.6

export interface ListLayout {
  itemHeight: number
  rowHeight: number
  /** null until the list is measured. */
  spare: number | null
}

// Room too small for the tile goes to the items instead.
export function layoutSpaceList(count: number, room: number | null, wide: boolean): ListLayout {
  const itemHeight = wide ? WIDE_ITEM_HEIGHT : ITEM_HEIGHT
  if (room === null) return { itemHeight, rowHeight: itemHeight, spare: null }
  const stretched = fitRowHeight(count, room, itemHeight, MAX_STRETCH)
  const rowHeight =
    room - count * stretched < itemHeight ? fitRowHeight(count, room, itemHeight) : stretched
  return { itemHeight, rowHeight, spare: room - count * rowHeight }
}
