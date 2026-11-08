import { useState } from 'react'
import { cn } from '@/lib/utils'

const MAX_LENGTH = 120

interface Props {
  name: string
  onRename: (name: string) => void
}

// Reads as the title until pointed at; an invisible copy of the text sizes the field.
export function NameField({ name, onRename }: Props) {
  const [draft, setDraft] = useState<string | null>(null)
  const value = draft ?? name
  const commit = () => {
    const next = draft?.trim()
    setDraft(null)
    if (next && next !== name) onRename(next)
  }

  return (
    <span className="relative grid min-w-0 max-w-md">
      <span
        aria-hidden="true"
        className="invisible col-start-1 row-start-1 overflow-hidden border border-transparent px-1.5 text-base font-bold whitespace-pre"
      >
        {value || ' '}
      </span>
      <input
        aria-label="Nazwa analizy"
        value={value}
        maxLength={MAX_LENGTH}
        onChange={(e) => setDraft(e.target.value)}
        onFocus={(e) => e.target.select()}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur()
          if (e.key === 'Escape') {
            setDraft(null)
            requestAnimationFrame(() => (e.target as HTMLInputElement).blur())
          }
        }}
        className={cn(
          'col-start-1 row-start-1 w-full min-w-0 border border-transparent bg-transparent px-1.5 text-base font-bold text-fg outline-none',
          'hover:border-line focus-visible:border-fg focus-visible:bg-surface'
        )}
      />
    </span>
  )
}
