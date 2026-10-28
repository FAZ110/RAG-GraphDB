import { XIcon } from 'lucide-react'
import { Button, IconButton, Kbd, Swatch } from '@/components/deck'
import { inkFor } from '@/design/inks'
import type { LoadedNode } from '@/types'
import type { PickTool } from '../useToolPicking'

const PROMPTS: Record<PickTool, (count: number) => string> = {
  expand: () => 'kliknij encję, której powiązania pokazać',
  path: (count) => (count === 0 ? 'kliknij pierwszą encję' : 'kliknij drugą encję'),
  common: (count) =>
    count < 2 ? 'klikaj encje, które porównać' : 'dodaj kolejne albo pokaż, co je łączy',
}

const TITLES: Record<PickTool, string> = {
  expand: 'Rozwiń powiązania',
  path: 'Najkrótsza ścieżka',
  common: 'Co je łączy',
}

interface Props {
  tool: PickTool
  picked: LoadedNode[]
  canRun: boolean
  onRun: () => void
  onCancel: () => void
}

/** A tool waiting for its entities: what to click next, and what has been picked so far. */
export function PickBar({ tool, picked, canRun, onRun, onCancel }: Props) {
  return (
    <div className="flex items-center gap-2 px-3 py-2">
      <p className="min-w-0 flex-1 truncate text-sm">
        <span className="font-semibold text-fg">{TITLES[tool]}</span>
        <span className="text-fg-subtle"> · {PROMPTS[tool](picked.length)}</span>
      </p>
      {picked.map((n) => (
        <span
          key={n.id}
          className="flex max-w-36 shrink-0 items-center gap-1 bg-surface-sunken px-2 py-1 text-xs font-medium text-fg-soft"
        >
          <Swatch color={inkFor(n.label).color} className="size-2 rounded-full" />
          <span className="truncate">{n.name}</span>
        </span>
      ))}
      {tool === 'common' && (
        <Button size="sm" variant="primary" disabled={!canRun} onClick={onRun}>
          Pokaż
          <Kbd>↵</Kbd>
        </Button>
      )}
      <IconButton variant="ghost" size="icon-sm" label="Anuluj (Esc)" onClick={onCancel}>
        <XIcon />
      </IconButton>
    </div>
  )
}
