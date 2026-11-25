import type { QueryAnswer } from '@/components/Analysis/query/QueryHost'
import type { GraphChunk } from '@/types'
import { MENTIONED_TOGETHER } from '@/types/query'

export function answerOnMap({ result, known }: QueryAnswer) {
  const found = result.matches.flatMap((m) => Object.values(m).flatMap((id) => id ?? []))
  const chunk: GraphChunk = {
    nodes: result.nodes,
    edges: result.edges.filter((e) => e.type !== MENTIONED_TOGETHER),
  }
  return { ids: new Set([...known, ...found]), focus: found[0] ?? known[0], chunk }
}
