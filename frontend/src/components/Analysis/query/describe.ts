import { relationName } from '@/components/canvas/relationName'
import { pluralForm } from '@/components/Spaces/spaceText'
import type { LinkMode } from '@/types/query'
import { countText } from './counting'
import type { Pattern, PatternEdge, PatternNode } from './pattern'

const STEP_FORMS = { one: 'kroku', few: 'kroków', many: 'kroków' }

/**
 * One relationship read the way it points, subject first: "Robert Lewandowski strzelił gol w ◎ Klub".
 * Links of the same relationship, way and length share one sentence: "◎ Zawodnik gra w A i B".
 */
export interface LinkSentence {
  kind: 'link'
  key: string
  /** The sought node the sentence opens with, when it is the one doing it; null otherwise. */
  lead: string | null
  /** `not`: told as "nie …"; `optional`: "(jeśli jest)" follows. */
  mode: LinkMode
  subjects: PatternNode[]
  phrase: string
  objects: PatternNode[]
  /** "(do 3 kroków)" for longer links, "(jeśli jest)" for optional ones, empty otherwise. */
  far: string
}

/** What is asked of a sought node itself: "◎ Klub ma więcej niż 5 powiązań". */
export interface TraitSentence {
  kind: 'trait'
  key: string
  lead: string
  subject: PatternNode
  traits: string[]
}

export type Statement = LinkSentence | TraitSentence

/** Each link is told once: by its sought end, the source when both ends are sought. */
function owner(edge: PatternEdge, byKey: Map<string, PatternNode>): string {
  if (!byKey.get(edge.source)!.known) return edge.source
  if (!byKey.get(edge.target)!.known) return edge.target
  return edge.source
}

/** The verb of a link, negated when the link must not exist: "gra w", "nie gra w". */
function phraseOf(edge: PatternEdge): string {
  const verb =
    edge.via === 'articles'
      ? 'występuje w artykułach razem z'
      : edge.type
        ? relationName(edge.type)
        : 'łączy się z'
  return edge.mode === 'not' ? `nie ${verb}` : verb
}

function traitsOf(node: PatternNode): string[] {
  const traits = []
  if (node.linkCount) traits.push(countText(node.linkCount))
  if (node.nameContains.trim()) traits.push(`ma w nazwie „${node.nameContains.trim()}”`)
  return traits
}

/** The pattern read out as plain sentences, sought node by sought node: its links, then its traits. */
export function describe(pattern: Pattern): Statement[] {
  const byKey = new Map(pattern.nodes.map((n) => [n.key, n]))
  const told = new Map<string, PatternEdge[]>()
  for (const edge of pattern.edges) {
    const key = owner(edge, byKey)
    told.set(key, [...(told.get(key) ?? []), edge])
  }

  const subjects = [
    ...pattern.nodes.filter((n) => !n.known),
    // Known nodes only speak for links between two known nodes.
    ...pattern.nodes.filter((n) => n.known && told.has(n.key)),
  ]
  return subjects.flatMap((subject) => {
    const groups = new Map<string, LinkSentence>()
    for (const edge of told.get(subject.key) ?? []) {
      const mine = edge.source === subject.key
      const other = byKey.get(mine ? edge.target : edge.source)!
      // Told from the subject unless the other one does it.
      const out =
        edge.via === 'articles' || edge.direction === 'any' || (edge.direction === 'out') === mine
      const phrase = phraseOf(edge)
      const far = [
        edge.via === 'relation' && edge.maxHops > 1
          ? `(do ${edge.maxHops} ${pluralForm(edge.maxHops, STEP_FORMS)})`
          : '',
        edge.mode === 'optional' ? '(jeśli jest)' : '',
      ]
        .filter(Boolean)
        .join(' ')
      const id = `${subject.key}|${out}|${edge.mode}|${phrase}|${far}`
      const group = groups.get(id) ?? {
        kind: 'link' as const,
        key: id,
        lead: out ? subject.key : null,
        mode: edge.mode,
        subjects: out ? [subject] : [],
        phrase,
        objects: out ? [] : [subject],
        far,
      }
      ;(out ? group.objects : group.subjects).push(other)
      groups.set(id, group)
    }
    const traits = subject.known ? [] : traitsOf(subject)
    const said: Statement[] = [...groups.values()]
    // A sought node with nothing asked of it still gets its sentence: "◎ Klub bez warunków".
    if (traits.length || (!subject.known && said.length === 0))
      said.push({
        kind: 'trait',
        key: `${subject.key}|traits`,
        lead: subject.key,
        subject,
        traits,
      })
    return said
  })
}

// Within one sentence: what it does, then what it is, then what it must not do.
const rank = (s: Statement) => (s.kind === 'trait' ? 1 : s.mode === 'not' ? 2 : 0)

/**
 * Statements opening with the same sought node told as one sentence:
 * "◎ Zawodnik gra w A, ma więcej niż 5 powiązań, ale nie grał dla B".
 */
export function sentences(statements: readonly Statement[]): Statement[][] {
  const out: Statement[][] = []
  for (const s of statements) {
    const last = out.at(-1)
    if (last && s.lead !== null && last[0].lead === s.lead) last.push(s)
    else out.push([s])
  }
  return out.map((group) => group.toSorted((a, b) => rank(a) - rank(b)))
}
