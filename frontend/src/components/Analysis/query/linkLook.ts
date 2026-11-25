import { relationName } from '@/components/canvas/relationName'
import type { PatternEdge } from './pattern'

/** What a link says on the drawing: "gra w", "nie: gra w", "może: trener dla". */
export function linkText(edge: PatternEdge): string {
  const verb =
    edge.via === 'articles'
      ? 'wspomniane razem'
      : (edge.type ? relationName(edge.type) : 'dowolne powiązanie') +
        (edge.maxHops > 1 ? ` · do ${edge.maxHops} kroków` : '')
  if (edge.mode === 'not') return `nie: ${verb}`
  if (edge.mode === 'optional') return `może: ${verb}`
  return verb
}

/** How a link's line is drawn: red for one that must not exist, dashed when it may not exist,
 * dotted through articles, broken for a longer link. */
export function linkDash(edge: PatternEdge): string | undefined {
  if (edge.via === 'articles') return '1 5'
  if (edge.mode === 'optional') return '3 5'
  if (edge.maxHops > 1) return '7 6'
  return undefined
}

export const linkColor = (edge: PatternEdge, on: boolean) =>
  edge.mode === 'not' ? 'var(--danger)' : on ? 'var(--fg)' : 'var(--fg-subtle)'
