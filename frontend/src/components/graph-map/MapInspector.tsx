import { useQuery } from '@tanstack/react-query'
import { CombineIcon, PencilIcon, SplineIcon, Trash2Icon, XIcon } from 'lucide-react'
import { useState } from 'react'
import { Button, ConfirmPopover, ErrorNote, IconButton, Swatch } from '@/components/deck'
import { Mentions } from '@/components/Analysis/panels/Mentions'
import { RelationGroups } from '@/components/Analysis/panels/RelationGroups'
import { Section } from '@/components/Analysis/panels/Section'
import { NodeForm } from './EditForms'
import { typeName } from '@/components/Spaces/spaceText'
import { FloatingPanel } from '@/components/workspace/FloatingPanel'
import { inkFor } from '@/design/inks'
import { SPACES_QUERY_KEY } from '@/hooks/useSpaces'
import { fetchNode } from '@/services/api'
import type { RelationGroup } from '@/types/analysis'
import type { PickKind } from './types'
import type { MapEdits } from './useMapEdits'

interface Props {
  spaceId: string
  nodeId: string
  edits: MapEdits
  onShowGroup: (group: RelationGroup) => void
  onOpenArticle: (articleId: string) => void
  onStartPick: (kind: PickKind) => void
  onClose: () => void
}

export function MapInspector({
  spaceId,
  nodeId,
  edits,
  onShowGroup,
  onOpenArticle,
  onStartPick,
  onClose,
}: Props) {
  const node = useQuery({
    queryKey: [...SPACES_QUERY_KEY, spaceId, 'nodes', nodeId],
    queryFn: () => fetchNode(spaceId, nodeId),
  })
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const data = node.data
  const description = data?.properties.description as string | null | undefined
  const aliases = (data?.properties.aliases as string[] | undefined) ?? []

  return (
    <FloatingPanel
      title={
        data ? (
          <span className="flex items-center gap-2 font-normal text-fg-subtle">
            <Swatch color={inkFor(data.label).color} className="rounded-full" />
            {typeName(data.label)}
          </span>
        ) : (
          <span className="font-normal text-fg-subtle">Encja</span>
        )
      }
      aside={
        <IconButton variant="ghost" size="icon-sm" label="Zamknij (Esc)" onClick={onClose}>
          <XIcon />
        </IconButton>
      }
    >
      {node.error && <ErrorNote className="m-3">{node.error.message}</ErrorNote>}
      {data && editing && (
        <div className="px-3 pt-2 pb-3">
          <NodeForm
            initial={{
              name: data.name,
              label: data.label,
              description: description ?? null,
              aliases,
            }}
            spaceId={spaceId}
            pending={edits.editNode.isPending}
            error={edits.editNode.error?.message ?? null}
            submitLabel="Zapisz"
            onSubmit={(fields) =>
              edits.editNode.mutate({ id: data.id, fields }, { onSuccess: () => setEditing(false) })
            }
            onCancel={() => setEditing(false)}
          />
        </div>
      )}
      {data && !editing && (
        <>
          <div className="px-3 pt-2 pb-3">
            <p className="text-heading text-fg">{data.name}</p>
            {aliases.length > 0 && (
              <p className="mt-0.5 text-xs text-fg-subtle">także: {aliases.join(', ')}</p>
            )}
            {description && (
              <p className="mt-2 line-clamp-5 text-sm text-fg-muted">{description}</p>
            )}
            <div className="mt-3 flex flex-wrap gap-1.5">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  edits.editNode.reset()
                  setEditing(true)
                }}
              >
                <PencilIcon />
                Edytuj
              </Button>
              <Button size="sm" variant="secondary" onClick={() => onStartPick('merge')}>
                <CombineIcon />
                Scal z…
              </Button>
              <Button size="sm" variant="secondary" onClick={() => onStartPick('link')}>
                <SplineIcon />
                Powiąż z…
              </Button>
              <ConfirmPopover
                open={deleting}
                onOpenChange={(open) => {
                  edits.removeNode.reset()
                  setDeleting(open)
                }}
                question={`Usunąć „${data.name}”?`}
                detail="Encja zniknie z grafu razem ze swoimi powiązaniami. Tego nie da się cofnąć."
                error={edits.removeNode.error?.message ?? null}
                pending={edits.removeNode.isPending}
                onConfirm={() => edits.removeNode.mutate(data.id, { onSuccess: onClose })}
              >
                <IconButton size="icon-sm" variant="danger-outline" label="Usuń encję">
                  <Trash2Icon />
                </IconButton>
              </ConfirmPopover>
            </div>
          </div>
          <Section title="Powiązania">
            <RelationGroups spaceId={spaceId} nodeId={data.id} onExpand={onShowGroup} />
          </Section>
          <Mentions spaceId={spaceId} node={data} onOpenArticle={onOpenArticle} />
        </>
      )}
    </FloatingPanel>
  )
}
