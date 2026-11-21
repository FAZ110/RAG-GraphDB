import type { Direction, SpaceSchema } from '@/types/query'

export interface RelationOption {
  type: string
  /** Seen from the link's source, the way most such links run; `any` when evenly split. */
  direction: Direction
  count: number
  /** The most common pair of types it links, as stored: who does what to whom. */
  example: { source: string; target: string }
}

/** Relationships the space has between these two types (null: any type), most used first. */
export function relationOptions(
  schema: SpaceSchema,
  source: string | null,
  target: string | null
): RelationOption[] {
  const fits = (want: string | null, label: string) => want === null || want === label
  const found = new Map<
    string,
    { out: number; in: number; same: boolean; top: number; example: RelationOption['example'] }
  >()
  for (const r of schema.relations) {
    const forward = fits(source, r.source) && fits(target, r.target)
    const backward = fits(source, r.target) && fits(target, r.source)
    if (!forward && !backward) continue
    const ways = found.get(r.type) ?? {
      out: 0,
      in: 0,
      same: false,
      top: 0,
      example: { source: r.source, target: r.target },
    }
    if (r.count > ways.top) {
      ways.top = r.count
      ways.example = { source: r.source, target: r.target }
    }
    // A link between two entities of one type can run either way, but counts once.
    if (r.source === r.target) {
      ways.out += r.count
      ways.same = true
    } else {
      if (forward) ways.out += r.count
      if (backward) ways.in += r.count
    }
    found.set(r.type, ways)
  }
  return [...found]
    .map(([type, ways]) => ({
      type,
      // The way most of these links run; a few stored backwards do not make it two-way.
      direction: (ways.same || ways.out === ways.in
        ? 'any'
        : ways.out > ways.in
          ? 'out'
          : 'in') as Direction,
      count: ways.out + ways.in,
      example: ways.example,
    }))
    .toSorted((a, b) => b.count - a.count)
}
