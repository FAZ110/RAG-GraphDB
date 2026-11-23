import { ArrowRightIcon, XIcon } from 'lucide-react'
import { Button, IconButton, Kbd, Swatch } from '@/components/deck'
import { inkFor } from '@/design/inks'
import { cn } from '@/lib/utils'
import type { LoadedNode } from '@/types'
import type { PickTool } from '../useToolPicking'

const PROMPTS: Record<Exclude<PickTool, 'path'>, (count: number) => string> = {
  expand: () => 'kliknij encję, której powiązania pokazać',
  mentions: () => 'kliknij encję, by zobaczyć, z czym piszą o niej artykuły',
  common: (count) =>
    count < 2 ? 'klikaj encje, które porównać' : 'dodaj kolejne albo pokaż, co je łączy',
}

const TITLES: Record<PickTool, string> = {
  expand: 'Rozwiń powiązania',
  mentions: 'Wymieniane razem',
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

function Picked({ node }: { node: LoadedNode }) {
  return (
    <span className="flex max-w-36 shrink-0 items-center gap-1 bg-surface-sunken px-2 py-1 text-xs font-medium text-fg-soft">
      <Swatch color={inkFor(node.label).color} className="size-2 rounded-full" />
      <span className="truncate">{node.name}</span>
    </span>
  )
}

/** Where a path starts or ends: the entity picked for it, or what to click to pick one. */
function End({ label, node, next }: { label: string; node?: LoadedNode; next: boolean }) {
  return (
    <span className="flex min-w-0 items-center gap-1.5">
      <span className="text-xs text-fg-subtle">{label}</span>
      {node ? (
        <Picked node={node} />
      ) : (
        <span
          className={cn(
            'border border-dashed px-2 py-0.5 text-xs whitespace-nowrap',
            next ? 'border-fg text-fg' : 'border-line text-fg-faint'
          )}
        >
          kliknij encję
        </span>
      )}
    </span>
  )
}

/** A tool waiting for its entities: what to click next, and what has been picked so far. */
export function PickBar({ tool, picked, canRun, onRun, onCancel }: Props) {
  return (
    <div className="flex items-center gap-2 px-3 py-2">
      {tool === 'path' ? (
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="shrink-0 text-sm font-semibold text-fg">{TITLES.path}</span>
          <End label="od" node={picked[0]} next={!picked[0]} />
          <ArrowRightIcon className="size-3.5 shrink-0 text-fg-subtle" aria-hidden="true" />
          <End label="do" node={picked[1]} next={Boolean(picked[0])} />
        </div>
      ) : (
        <>
          <p className="min-w-0 flex-1 truncate text-sm">
            <span className="font-semibold text-fg">{TITLES[tool]}</span>
            <span className="text-fg-subtle"> · {PROMPTS[tool](picked.length)}</span>
          </p>
          {picked.map((n) => (
            <Picked key={n.id} node={n} />
          ))}
        </>
      )}
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
