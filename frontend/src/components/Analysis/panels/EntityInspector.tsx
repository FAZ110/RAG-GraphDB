import { CircleDotDashedIcon, Trash2Icon } from 'lucide-react'
import { Button, Kbd, Swatch } from '@/components/deck'
import { typeName } from '@/components/Spaces/spaceText'
import { FloatingPanel } from '@/components/workspace/FloatingPanel'
import { inkFor } from '@/design/inks'
import type { LoadedNode } from '@/types'
import type { RelationGroup } from '@/types/analysis'
import { Mentions } from './Mentions'
import { RelationGroups } from './RelationGroups'
import { Section } from './Section'

interface Props {
  spaceId: string
  node: LoadedNode
  onExpand: (group?: RelationGroup) => void
  onRemove: () => void
  onOpenArticle: (articleId: string) => void
}

export function EntityInspector({ spaceId, node, onExpand, onRemove, onOpenArticle }: Props) {
  const description = node.properties.description as string | null | undefined
  const aliases = (node.properties.aliases as string[] | undefined) ?? []

  return (
    <FloatingPanel
      title={
        <span className="flex items-center gap-2 font-normal text-fg-subtle">
          <Swatch color={inkFor(node.label).color} className="rounded-full" />
          {typeName(node.label)}
        </span>
      }
    >
      <div className="px-3 pt-2 pb-3">
        <p className="text-heading text-fg">{node.name}</p>
        {aliases.length > 0 && (
          <p className="mt-0.5 text-xs text-fg-subtle">także: {aliases.join(', ')}</p>
        )}
        {description && <p className="mt-2 line-clamp-5 text-sm text-fg-muted">{description}</p>}
        <div className="mt-3 flex gap-2">
          <Button size="sm" variant="primary" onClick={() => onExpand()}>
            <CircleDotDashedIcon />
            Rozwiń
            <Kbd>E</Kbd>
          </Button>
          <Button size="sm" variant="danger-outline" onClick={onRemove}>
            <Trash2Icon />
            Usuń z analizy
          </Button>
        </div>
      </div>
      <Section title="Powiązania">
        <RelationGroups spaceId={spaceId} nodeId={node.id} onExpand={onExpand} />
      </Section>
      <Mentions spaceId={spaceId} node={node} onOpenArticle={onOpenArticle} />
    </FloatingPanel>
  )
}
