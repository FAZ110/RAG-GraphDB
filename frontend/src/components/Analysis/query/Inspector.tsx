import { Trash2Icon, XIcon } from 'lucide-react'
import { useEffect, useEffectEvent } from 'react'
import type { ReactNode } from 'react'
import { Button, IconButton, Swatch } from '@/components/deck'
import { typeName } from '@/components/Spaces/spaceText'
import { inkFor } from '@/design/inks'
import type { SpaceSchema } from '@/types/query'
import { EdgeEditor } from './EdgeEditor'
import { KnownGroup } from './KnownGroup'
import { needed, nodeTitle } from './names'
import { NodeEditor } from './NodeEditor'
import type { Pattern } from './pattern'
import { removeEdge, removeNode, updateEdge, updateNode } from './pattern'
import { SoughtTag } from './SoughtTag'

interface Props {
  spaceId: string
  pattern: Pattern
  /** The node or link whose settings are shown. */
  selected: string
  schema: SpaceSchema | undefined
  onChange: (next: Pattern, select?: string | null) => void
  onClose: () => void
}

/** Settings of the clicked part, docked under the drawing so the answer stays in view. */
export function Inspector({ spaceId, pattern, selected, schema, onChange, onClose }: Props) {
  // Escape puts the settings away before the modal sees it.
  const onKey = useEffectEvent((e: KeyboardEvent) => {
    // A search field handles its own Escape.
    if (e.key !== 'Escape' || (e.target as HTMLElement).closest('[data-add-entity]')) return
    e.stopPropagation()
    onClose()
  })
  useEffect(() => {
    window.addEventListener('keydown', onKey, { capture: true })
    return () => window.removeEventListener('keydown', onKey, { capture: true })
  }, [])

  const node = pattern.nodes.find((n) => n.key === selected)
  const edge = pattern.edges.find((e) => e.key === selected)
  if (!node && !edge) return null

  let title: ReactNode
  let body: ReactNode
  let remove: { label: string; next: Pattern }
  if (edge) {
    const source = pattern.nodes.find((n) => n.key === edge.source)!
    const target = pattern.nodes.find((n) => n.key === edge.target)!
    title = (
      <span className="text-sm text-fg-soft">
        Połączenie <span className="font-semibold text-fg">{nodeTitle(source)}</span> i{' '}
        <span className="font-semibold text-fg">{nodeTitle(target)}</span>
      </span>
    )
    body = (
      <EdgeEditor
        edge={edge}
        source={source}
        target={target}
        schema={schema}
        blocked={blocks(pattern, edge.key)}
        onChange={(change) => onChange(updateEdge(pattern, edge.key, change))}
      />
    )
    remove = { label: 'Usuń połączenie', next: removeEdge(pattern, edge.key) }
  } else if (node!.known) {
    const group = node!.known.length > 1
    const [first] = node!.known
    // A group is named as one; its entities are listed in the rows below.
    title = group ? (
      <span className="text-sm text-fg-soft">
        Grupa <span className="font-semibold text-fg">{node!.known.length} znanych encji</span>,
        wystarczy {needed(node!)}
      </span>
    ) : (
      <span className="flex items-center gap-1.5 text-sm">
        <Swatch color={inkFor(first.label).color} className="size-2" />
        <span className="font-semibold text-fg">{first.name}</span>
        <span className="text-xs text-fg-subtle">{typeName(first.label)}</span>
      </span>
    )
    body = <KnownGroup spaceId={spaceId} pattern={pattern} node={node!} onChange={onChange} />
    remove = { label: 'Usuń z pytania', next: removeNode(pattern, node!.key) }
  } else {
    title = <SoughtTag node={node!} className="text-sm" />
    body = (
      <NodeEditor
        node={node!}
        schema={schema}
        onChange={(change) => onChange(updateNode(pattern, node!.key, change))}
      />
    )
    remove = { label: 'Usuń z pytania', next: removeNode(pattern, node!.key) }
  }

  return (
    <section
      aria-label="Ustawienia zaznaczonego elementu"
      className="min-h-0 overflow-y-auto border-t border-line bg-surface px-5 pt-3 pb-4"
    >
      <header className="mb-3 flex items-center gap-2">
        <div className="min-w-0 flex-1">{title}</div>
        <Button size="sm" variant="ghost-danger" onClick={() => onChange(remove.next, null)}>
          <Trash2Icon />
          {remove.label}
        </Button>
        <IconButton variant="ghost" size="icon-sm" label="Zamknij ustawienia" onClick={onClose}>
          <XIcon />
        </IconButton>
      </header>
      {body}
    </section>
  )
}

/** Why a link cannot be optional or must-not-exist here, in the user's words. */
function blocks(p: Pattern, key: string): { optional: string | null; not: string | null } {
  const edge = p.edges.find((e) => e.key === key)!
  const ends = [edge.source, edge.target].map((k) => p.nodes.find((n) => n.key === k)!)
  const lone = ends.some(
    (n) => !n.known && p.edges.filter((e) => e.source === n.key || e.target === n.key).length === 1
  )
  return {
    optional: lone
      ? null
      : 'Może istnieć tylko połączenie z szukaną encją, która nie ma innych połączeń',
    not: ends.some((n) => !n.known) ? null : 'Wykluczyć można tylko połączenie z szukaną encją',
  }
}
