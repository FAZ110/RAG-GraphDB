import type { QueryResult } from '@/types/query'
import { EntityList } from './EntityList'
import { MatchList } from './MatchList'
import type { Pattern } from './pattern'
import type { Lit } from './PatternStage'

interface Props {
  pattern: Pattern
  result: QueryResult
  onPick: (id: string) => void
  /** The next page of the answer, while there is one. */
  more: { has: boolean; loading: boolean; load: () => void }
  /** The sought nodes to pick out in the drawing, with the entities of a hovered match. */
  onHover: (lit: Lit | null) => void
}

/** The answer's list: one sought node's entities, or whole matches when several are sought. */
export function QueryResults({ pattern, result, onPick, more, onHover }: Props) {
  const sought = pattern.nodes.filter((n) => !n.known)
  const list = { result, onPick, more, onHover }
  return (
    <>
      {sought.length > 1 ? (
        <MatchList pattern={pattern} {...list} />
      ) : (
        sought[0] && <EntityList node={sought[0]} {...list} />
      )}
      {result.truncated && !more.has && (
        <p className="px-5 py-3 text-xs text-fg-subtle">
          Dopasowań było więcej, niż baza zwraca na raz; zawęź pytanie, żeby zobaczyć wszystkie.
        </p>
      )}
    </>
  )
}
