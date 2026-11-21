import { Fragment } from 'react'
import { Swatch } from '@/components/deck'
import { inkFor } from '@/design/inks'
import { cn } from '@/lib/utils'
import type { Statement } from './describe'
import { describe, sentences } from './describe'
import type { Pattern, PatternNode } from './pattern'
import { labelOf } from './pattern'
import { SoughtTag } from './SoughtTag'

function Ref({ node }: { node: PatternNode }) {
  const label = labelOf(node)
  if (node.known) {
    const names = node.known.map((e) => e.name)
    const content = (
      <>
        {label && <Swatch color={inkFor(label).color} className="size-2 self-center" />}
        {node.atLeast ? (
          <span>
            <span className="font-normal text-fg-soft">co najmniej {node.atLeast} z: </span>
            {names.join(', ')}
          </span>
        ) : (
          names.join(' lub ')
        )}
      </>
    )
    return (
      <span className="inline-flex items-baseline gap-1.5 font-semibold text-fg">{content}</span>
    )
  }
  return <SoughtTag node={node} />
}

/** "A", "A i B", "A, B i C"; "A ani B" for what must not be. */
function Refs({ nodes, last = ' i ' }: { nodes: PatternNode[]; last?: string }) {
  return nodes.map((node, i) => (
    <Fragment key={node.key}>
      {i > 0 && <span className="text-fg-soft">{i === nodes.length - 1 ? last : ', '}</span>}
      <Ref node={node} />
    </Fragment>
  ))
}

/** One statement; `bare` leaves out its opening node, said once for the whole sentence. */
function Said({ statement, bare }: { statement: Statement; bare: boolean }) {
  if (statement.kind === 'trait') {
    const traits = statement.traits.length ? statement.traits.join(' i ') : 'bez warunków'
    return (
      <>
        {!bare && (
          <>
            <Ref node={statement.subject} />{' '}
          </>
        )}
        <span className="text-fg-soft">{traits}</span>
      </>
    )
  }
  const not = statement.mode === 'not'
  return (
    <>
      {!bare && (
        <>
          <Refs nodes={statement.subjects} />{' '}
        </>
      )}
      <span className={not ? 'font-medium text-danger' : 'text-fg-soft'}>{statement.phrase}</span>{' '}
      <Refs nodes={statement.objects} last={not ? ' ani ' : ' i '} />
      {statement.far && <span className="text-fg-muted"> {statement.far}</span>}
    </>
  )
}

/** "but" before the first thing that must not be, after what must. */
const joiner = (prev: Statement, next: Statement) =>
  next.kind === 'link' && next.mode === 'not' && !(prev.kind === 'link' && prev.mode === 'not')
    ? ', ale '
    : ', '

interface Props {
  pattern: Pattern
  className?: string
}

/** The question read out as plain sentences, each relationship in the way it points. */
export function Sentence({ pattern, className }: Props) {
  if (pattern.edges.length === 0 && pattern.nodes.some((n) => n.known)) {
    return (
      <p className={cn('text-fg-muted', className)}>
        Połącz węzły, a pytanie ułoży się tutaj w zdania.
      </p>
    )
  }
  return (
    <div className={className}>
      <ul className="flex flex-col gap-1.5">
        {/* A new sentence fades in where it lands. */}
        {sentences(describe(pattern)).map((group) => (
          <li key={group[0].key} className="animate-in leading-relaxed fade-in-0 spring-quick">
            {group.map((statement, i) => (
              <Fragment key={statement.key}>
                {i > 0 && <span className="text-fg-soft">{joiner(group[i - 1], statement)}</span>}
                <Said statement={statement} bare={i > 0} />
              </Fragment>
            ))}
            <span className="text-fg-soft">.</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
