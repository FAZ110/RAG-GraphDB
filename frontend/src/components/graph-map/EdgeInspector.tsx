import { FileTextIcon, PencilIcon, Trash2Icon, XIcon } from 'lucide-react'
import { useState } from 'react'
import { Button, ConfirmPopover, IconButton } from '@/components/deck'
import { Section } from '@/components/Analysis/panels/Section'
import { relationName } from '@/components/canvas/relationName'
import { EdgeTypeForm } from './EditForms'
import { FloatingPanel } from '@/components/workspace/FloatingPanel'
import { useEdgeSources } from '@/hooks/useSpaces'
import type { MapEdits } from './useMapEdits'

export interface InspectedEdge {
  id: string
  type: string
  source: string
  target: string
}

interface Props {
  spaceId: string
  edge: InspectedEdge
  edits: MapEdits
  onReplaced: (edgeId: string) => void
  onOpenArticle: (articleId: string) => void
  onClose: () => void
}

export function EdgeInspector({ spaceId, edge, edits, onReplaced, onOpenArticle, onClose }: Props) {
  const sources = useEdgeSources(spaceId, edge.id)
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)

  return (
    <FloatingPanel
      title={<span className="font-normal text-fg-subtle">Powiązanie</span>}
      aside={
        <IconButton variant="ghost" size="icon-sm" label="Zamknij (Esc)" onClick={onClose}>
          <XIcon />
        </IconButton>
      }
    >
      <div className="px-3 pt-2 pb-3">
        <p className="text-sm text-fg">
          <span className="font-semibold">{edge.source}</span>{' '}
          <span className="text-fg-muted">{relationName(edge.type)}</span>{' '}
          <span className="font-semibold">{edge.target}</span>
        </p>
        {editing ? (
          <div className="mt-3">
            <EdgeTypeForm
              initial={edge.type}
              pending={edits.editEdge.isPending}
              error={edits.editEdge.error?.message ?? null}
              submitLabel="Zapisz"
              onSubmit={(type) =>
                edits.editEdge.mutate(
                  { id: edge.id, type },
                  {
                    onSuccess: (next) => {
                      setEditing(false)
                      onReplaced(next.id)
                    },
                  }
                )
              }
              onCancel={() => setEditing(false)}
            />
          </div>
        ) : (
          <div className="mt-3 flex gap-1.5">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                edits.editEdge.reset()
                setEditing(true)
              }}
            >
              <PencilIcon />
              Zmień typ
            </Button>
            <ConfirmPopover
              open={deleting}
              onOpenChange={(open) => {
                edits.removeEdge.reset()
                setDeleting(open)
              }}
              question="Usunąć to powiązanie?"
              detail="Zniknie z grafu. Tego nie da się cofnąć."
              error={edits.removeEdge.error?.message ?? null}
              pending={edits.removeEdge.isPending}
              onConfirm={() => edits.removeEdge.mutate(edge.id, { onSuccess: onClose })}
            >
              <IconButton size="icon-sm" variant="danger-outline" label="Usuń powiązanie">
                <Trash2Icon />
              </IconButton>
            </ConfirmPopover>
          </div>
        )}
      </div>
      <Section title="Źródła">
        {sources.isPending ? (
          <p className="px-3 py-2 text-sm text-fg-subtle">Wczytuję…</p>
        ) : sources.isError ? (
          <p className="px-3 py-2 text-sm text-danger">{sources.error.message}</p>
        ) : sources.data.length === 0 ? (
          <p className="px-3 py-2 text-sm text-fg-subtle">Dodane ręcznie, bez artykułu</p>
        ) : (
          <ul className="pb-2">
            {sources.data.map((s) => (
              <li key={s.article_id}>
                <button
                  type="button"
                  onClick={() => onOpenArticle(s.article_id)}
                  className="flex w-full flex-col gap-1 px-3 py-1.5 text-left hover:bg-surface-sunken"
                >
                  <span className="flex items-center gap-1.5 text-sm text-fg-soft">
                    <FileTextIcon className="size-3.5 shrink-0 text-fg-subtle" />
                    <span className="truncate">{s.title || 'Artykuł bez tytułu'}</span>
                  </span>
                  {s.quotes.slice(0, 2).map((q, i) => (
                    <q key={i} className="line-clamp-2 text-xs text-fg-muted">
                      {q}
                    </q>
                  ))}
                </button>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </FloatingPanel>
  )
}
