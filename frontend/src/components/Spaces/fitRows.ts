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
