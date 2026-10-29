import { BlendIcon, RouteIcon, Trash2Icon, XIcon } from 'lucide-react'
import { Button, IconButton, Kbd, Swatch } from '@/components/deck'
import { ENTITY_FORMS, pluralForm } from '@/components/Spaces/spaceText'
import { FloatingPanel } from '@/components/workspace/FloatingPanel'
import { inkFor } from '@/design/inks'
import type { LoadedNode } from '@/types'

interface Props {
  nodes: LoadedNode[]
  onCommon: () => void
  onPath: () => void
  onRemove: () => void
  onDeselect: (id: string) => void
}

export function SelectionInspector({ nodes, onCommon, onPath, onRemove, onDeselect }: Props) {
  return (
    <FloatingPanel title={`Zaznaczone: ${nodes.length} ${pluralForm(nodes.length, ENTITY_FORMS)}`}>
      <div className="flex flex-col gap-2 p-3">
        <Button size="sm" variant="primary" onClick={onCommon} className="justify-start">
          <BlendIcon />
          Co je łączy
          <Kbd>C</Kbd>
        </Button>
        {nodes.length === 2 && (
          <Button size="sm" onClick={onPath} className="justify-start">
            <RouteIcon />
            Najkrótsza ścieżka
            <Kbd>P</Kbd>
          </Button>
        )}
        <Button size="sm" variant="danger-outline" onClick={onRemove} className="justify-start">
          <Trash2Icon />
          Usuń z analizy
        </Button>
      </div>
      <ul className="border-t border-line-soft py-1">
        {nodes.map((n) => (
          <li key={n.id} className="group flex items-center gap-2 pr-1 pl-3 text-sm text-fg-soft">
            <Swatch color={inkFor(n.label).color} className="rounded-full" />
            <span className="min-w-0 flex-1 truncate py-1">{n.name}</span>
            <IconButton
              variant="ghost"
              size="icon-sm"
              label={`Odznacz: ${n.name}`}
              onClick={() => onDeselect(n.id)}
              className="size-7 opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
            >
              <XIcon />
            </IconButton>
          </li>
        ))}
      </ul>
    </FloatingPanel>
  )
}
