// The lists snap row by row, so once they scroll their rows stretch until a whole number of
// them fills `room` and no row is ever cut off.
export function fitRowHeight(
  rows: number,
  room: number | null,
  base: number,
  maxStretch = Infinity
): number {
  if (room === null || rows === 0) return base
  const fit = Math.max(1, Math.floor(room / base))
  return rows > fit ? room / fit : Math.min(room / rows, base * maxStretch)
}

// Beyond this the spare room goes to a tile for adding more instead.
const MAX_STRETCH = 1.6

export interface RowLayout {
  rowHeight: number
  /** Room left under the rows for the tile; null until the list is measured. */
  spare: number | null
}

// Room too small for the tile goes to the rows instead.
export function layoutRows(count: number, room: number | null, base: number): RowLayout {
  if (room === null) return { rowHeight: base, spare: null }
  const stretched = fitRowHeight(count, room, base, MAX_STRETCH)
  const rowHeight = room - count * stretched < base ? fitRowHeight(count, room, base) : stretched
  return { rowHeight, spare: room - count * rowHeight }
}
