import { PlusIcon, XIcon } from 'lucide-react'
import { useState } from 'react'
import { IconButton, Swatch } from '@/components/deck'
import { typeName } from '@/components/Spaces/spaceText'
import { inkFor } from '@/design/inks'
import { AddEntity } from './AddEntity'
import type { Pattern, PatternNode } from './pattern'
import { addToGroup, removeFromGroup, updateNode } from './pattern'
import { needed } from './names'
import { Row } from './Row'
import { Stepper } from './Stepper'

interface Props {
  spaceId: string
  pattern: Pattern
  node: PatternNode
  onChange: (next: Pattern, select?: string | null) => void
}

/** The entities a known node stands for, and how many of them a match must be linked to. */
export function KnownGroup({ spaceId, pattern, node, onChange }: Props) {
  const [adding, setAdding] = useState(false)
  const known = node.known!
  const inside = new Set(pattern.nodes.flatMap((n) => n.known?.map((e) => e.id) ?? []))
  const atLeast = node.atLeast ?? 1
  const add = (
    <AddEntity
      spaceId={spaceId}
      inside={inside}
      label="Dodaj encję do grupy"
      icon={<PlusIcon />}
      open={adding}
      onOpen={setAdding}
      onPick={(entity) => {
        setAdding(false)
        onChange(addToGroup(pattern, node.key, entity))
      }}
    />
  )

  if (known.length === 1) {
    return (
      <Row label="Grupa">
        <div className="flex flex-col items-start gap-1.5">
          <p className="text-xs text-fg-soft">
            Dodaj kolejne encje, żeby szukać powiązań z którąkolwiek z nich albo z kilkoma naraz.
          </p>
          {add}
        </div>
      </Row>
    )
  }
  return (
    <div className="flex flex-col divide-y divide-line-soft *:py-3 *:first:pt-0 *:last:pb-0">
      <Row label="Encje">
        <div className="flex flex-wrap items-center gap-1.5">
          {known.map((e) => (
            <span
              key={e.id}
              className="flex h-7 items-center gap-1.5 border border-line bg-surface pr-0.5 pl-2 text-xs"
            >
              <Swatch color={inkFor(e.label).color} className="size-2" />
              <span className="font-medium text-fg">{e.name}</span>
              <span className="text-fg-subtle">{typeName(e.label)}</span>
              <IconButton
                variant="ghost"
                size="icon-sm"
                className="size-6"
                label={`Usuń ${e.name} z grupy`}
                onClick={() => onChange(removeFromGroup(pattern, node.key, e.id))}
              >
                <XIcon />
              </IconButton>
            </span>
          ))}
          {add}
        </div>
      </Row>
      <Row label="Wystarczy">
        <div className="flex items-center gap-3">
          <Stepper
            value={atLeast}
            min={1}
            max={known.length}
            label="Z ilu encji grupy"
            onChange={(n) => onChange(updateNode(pattern, node.key, { atLeast: n > 1 ? n : null }))}
          />
          <span className="text-xs text-fg-soft">{needed(node)}</span>
        </div>
      </Row>
    </div>
  )
}
