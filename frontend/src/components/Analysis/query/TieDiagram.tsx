import { ArrowLeftIcon, ArrowRightIcon, FileTextIcon } from 'lucide-react'
import { relationName } from '@/components/canvas/relationName'
import { typeName } from '@/components/Spaces/spaceText'
import { inkFor, PENCIL } from '@/design/inks'
import { cn } from '@/lib/utils'
import { MENTIONED_TOGETHER } from '@/types/query'
import type { Known, Tie } from './links'

/** An entity as a small node, inked by its type like on the drawing. */
function Chip({ node, strong = false }: { node: Known; strong?: boolean }) {
  const ink = node.label ? inkFor(node.label) : PENCIL
  return (
    <span
      title={node.label ? `${node.name} · ${typeName(node.label)}` : node.name}
      className={cn(
        'inline-flex h-7 max-w-full min-w-0 items-center gap-1.5 border px-2 text-xs',
        strong && 'shadow-[3px_3px_0_var(--fg)]'
      )}
      style={{ borderColor: ink.color, background: ink.field }}
    >
      <span className="truncate font-semibold" style={{ color: ink.color }}>
        {node.name}
      </span>
      {node.label && <span className="shrink-0 text-fg-subtle">{typeName(node.label)}</span>}
    </span>
  )
}

/** A relationship on a branch, its arrow pointing the way it runs from the result. */
function Rel({ type, out }: { type: string; out: boolean }) {
  if (type === MENTIONED_TOGETHER)
    return (
      <span className="inline-flex h-6 shrink-0 items-center gap-1 border border-dashed border-line bg-surface px-1.5 text-xs whitespace-nowrap text-fg-soft">
        <FileTextIcon className="size-3" aria-hidden />
        wspominani razem
      </span>
    )
  return (
    <span
      title={relationName(type)}
      className="inline-flex h-6 max-w-[45%] shrink-0 items-center gap-1 border border-line bg-surface px-1.5 text-xs whitespace-nowrap text-fg-soft"
    >
      {!out && <ArrowLeftIcon className="size-3 shrink-0" aria-label="od niej" />}
      <span className="truncate">{relationName(type)}</span>
      {out && <ArrowRightIcon className="size-3 shrink-0" aria-label="do niej" />}
    </span>
  )
}

interface Props {
  root: Known
  ties: readonly Tie[]
}

/** Why a result answers: the result at the top, a branch for each relationship it has, to the
 * entity at its other end. */
export function TieDiagram({ root, ties }: Props) {
  return (
    <div className="flex flex-col items-start">
      <Chip node={root} strong />
      <ul className="ml-4 flex w-[calc(100%-1rem)] flex-col">
        {/* One relationship per branch; an entity tied several ways gets its branches together. */}
        {ties.flatMap((tie) =>
          tie.rels.map((rel) => (
            <li
              key={rel.key}
              // The trunk runs down to the last branch, which ends it.
              className="relative flex min-w-0 items-center gap-2 py-1 pl-5 before:absolute before:top-0 before:left-0 before:h-full before:w-px before:bg-fg-subtle last:before:h-1/2 after:absolute after:top-1/2 after:left-0 after:h-px after:w-4 after:bg-fg-subtle"
            >
              <Rel type={rel.type} out={rel.out} />
              <span aria-hidden className="h-px min-w-3 flex-1 bg-fg-subtle" />
              <Chip node={tie.other} />
            </li>
          ))
        )}
      </ul>
    </div>
  )
}
