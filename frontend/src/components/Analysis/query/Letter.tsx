import { cn } from '@/lib/utils'

/** A sought node's letter, the same in the drawing, the question and the answer. */
export function Letter({ letter, className }: { letter: string; className?: string }) {
  return (
    <span
      aria-label={`szukana ${letter}`}
      className={cn('shrink-0 font-mono leading-none font-semibold text-fg-muted', className)}
    >
      {letter}
    </span>
  )
}
