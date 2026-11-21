import { typeName } from '@/components/Spaces/spaceText'
import type { PatternNode } from './pattern'
import { labelOf } from './pattern'
import { countCaption } from './counting'

/** The caption of a sought node with no conditions. */
export const SOUGHT = 'szukana encja'

/** A node as the drawing and the results name it: its entity, the first of its group and how
 * many more ("Robert Lewandowski +2"), or the type it is sought as. */
export function nodeTitle(node: PatternNode): string {
  if (node.known)
    return node.known.length > 1
      ? `${node.known[0].name} +${node.known.length - 1}`
      : node.known[0].name
  const label = labelOf(node)
  return label ? typeName(label) : 'Dowolna encja'
}

/** How many of a group a match needs: "jedna z 3", "co najmniej 2 z 3", "wszystkie 3". */
export function needed(node: PatternNode): string {
  const n = node.known?.length ?? 0
  const k = node.atLeast ?? 1
  return k === 1 ? `jedna z ${n}` : k === n ? `wszystkie ${n}` : `co najmniej ${k} z ${n}`
}

/** What a node stands for: the known entities' type and, for a group, how many it needs;
 * or the sought node's conditions. */
export function caption(node: PatternNode): string {
  const label = labelOf(node)
  const type = label ? typeName(label) : 'Różne typy'
  if (node.known && node.known.length > 1) return `${type} · ${needed(node)}`
  if (node.known) return type
  const parts = []
  if (node.linkCount) parts.push(countCaption(node.linkCount))
  if (node.nameContains.trim()) parts.push(`„${node.nameContains.trim()}”`)
  return parts.join(' · ') || SOUGHT
}
