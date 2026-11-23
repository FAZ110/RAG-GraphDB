import { CircleDotDashedIcon, NewspaperIcon, RouteIcon, Trash2Icon } from 'lucide-react'
import { Button, IconButton, Swatch } from '@/components/deck'
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
  onMentions: () => void
  /** Start a path from it; the next entity clicked is where it leads. */
  onPath: () => void
  onRemove: () => void
  onOpenArticle: (articleId: string) => void
}

export function EntityInspector({
  spaceId,
  node,
  onExpand,
  onMentions,
  onPath,
  onRemove,
  onOpenArticle,
}: Props) {
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
      aside={
        <IconButton variant="remove" size="icon-sm" label="Usuń z analizy" onClick={onRemove}>
          <Trash2Icon />
        </IconButton>
      }
    >
      <div className="px-3 pt-2 pb-3">
        <p className="text-heading text-fg">{node.name}</p>
        {aliases.length > 0 && (
          <p className="mt-0.5 text-xs text-fg-subtle">także: {aliases.join(', ')}</p>
        )}
        {description && <p className="mt-2 line-clamp-5 text-sm text-fg-muted">{description}</p>}
        <div className="mt-3 grid grid-cols-3 gap-2">
          {/* Three to a row leave no room for the shortcuts, which the titles give instead. */}
          <Button
            size="sm"
            variant="primary"
            onClick={() => onExpand()}
            title="Rozwiń (E)"
            className="px-2"
          >
            <CircleDotDashedIcon />
            Rozwiń
          </Button>
          <Button
            size="sm"
            onClick={onMentions}
            title="Wymieniane razem w artykułach (M)"
            className="px-2"
          >
            <NewspaperIcon />
            Razem
          </Button>
          <Button
            size="sm"
            onClick={onPath}
            title="Najkrótsza ścieżka do innej encji (P)"
            className="px-2"
          >
            <RouteIcon />
            Ścieżka
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
