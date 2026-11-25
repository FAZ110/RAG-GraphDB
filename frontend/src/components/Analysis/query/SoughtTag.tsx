import { ScanSearchIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Letter } from './Letter'
import { useLetters } from './letters'
import { nodeTitle } from './names'
import type { PatternNode } from './pattern'

/** A sought node named in text: dashed like in the drawing, with the mark of the unknown. */
export function SoughtTag({
  node,
  className,
  children,
}: {
  node: PatternNode
  className?: string
  /** More after the name, e.g. the type the answer is narrowed to. */
  children?: ReactNode
}) {
  const letter = useLetters().get(node.key)
  return (
    <span
      className={cn(
        'inline-flex max-w-full min-w-0 items-center gap-1 border border-dashed border-fg-subtle px-1.5 font-medium text-fg',
        className
      )}
    >
      {letter ? (
        <Letter letter={letter} className="text-[0.85em]" />
      ) : (
        <ScanSearchIcon className="size-[0.9em] shrink-0 text-fg-muted" aria-label="szukana" />
      )}
      <span className="truncate">{nodeTitle(node)}</span>
      {children}
    </span>
  )
}
