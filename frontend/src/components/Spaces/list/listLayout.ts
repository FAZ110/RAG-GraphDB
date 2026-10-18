import { layoutRows } from '../fitRows'
import type { RowLayout } from '../fitRows'

// Shortest items, including their 1px bottom border.
const ITEM_HEIGHT = 57

export function layoutSpaceList(
  count: number,
  room: number | null
): RowLayout & { itemHeight: number } {
  return { itemHeight: ITEM_HEIGHT, ...layoutRows(count, room, ITEM_HEIGHT) }
}
