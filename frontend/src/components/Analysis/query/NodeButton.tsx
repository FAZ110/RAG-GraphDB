import { PlusIcon, ScanSearchIcon } from 'lucide-react'
import { focusRing } from '@/components/deck/styles'
import { cn } from '@/lib/utils'

interface Props {
  /** Which node it adds, drawn as a small one of those: dashed and marked, or plain. */
  kind: 'sought' | 'known'
  label: string
  title: string
  disabled?: boolean
  /** For a known node: the colours of the space's commonest types, shown as its mark. */
  inks?: readonly string[]
  onClick: () => void
}

/** A tool shaped like the node it adds to the drawing. */
export function NodeButton({ kind, label, title, disabled, inks = [], onClick }: Props) {
  const sought = kind === 'sought'
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'flex h-8 items-stretch border border-fg-subtle text-xs font-medium text-fg transition-[border-color,box-shadow] spring-quick',
        'hover:border-fg hover:shadow-[2px_2px_0_var(--fg)] disabled:opacity-40 disabled:hover:border-fg-subtle disabled:hover:shadow-none',
        sought ? 'border-dashed bg-surface' : 'bg-surface',
        focusRing
      )}
    >
      {sought ? (
        // Not known yet: the dashed mark of a sought node.
        <span className="flex w-7 items-center justify-center border-r border-dashed border-fg-subtle bg-surface-sunken text-fg-muted">
          <ScanSearchIcon className="size-3.5" aria-hidden />
        </span>
      ) : (
        // A real entity of the graph: the colours its types are drawn in.
        <span
          aria-hidden
          className="flex w-7 items-center justify-center border-r border-fg-subtle bg-surface-sunken"
        >
          <span className="flex -space-x-1">
            {(inks.length ? inks : ['var(--fg-subtle)']).map((color, i) => (
              <span
                key={i}
                className="size-2 ring-1 ring-surface-sunken"
                style={{ background: color }}
              />
            ))}
          </span>
        </span>
      )}
      <span className="flex items-center gap-1 px-2.5">
        <PlusIcon className="size-3.5 text-fg-muted" aria-hidden />
        {label}
      </span>
    </button>
  )
}
