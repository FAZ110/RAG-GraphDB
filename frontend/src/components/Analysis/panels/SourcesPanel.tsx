import { FloatingPanel } from '@/components/workspace/FloatingPanel'
import { useCanvasSources } from '../state/useCanvasSources'
import type { SourceArticle } from '@/types/analysis'
import { ArticleRow } from './ArticleRow'

interface Props {
  spaceId: string
  entityIds: readonly string[]
  labelOf: (id: string) => string | undefined
  onHover: (article: SourceArticle | null) => void
  onOpen: (articleId: string) => void
  onAddEntities: (articleId: string) => void
}

/** The articles behind what is on the canvas, those covering most of it first. */
export function SourcesPanel({
  spaceId,
  entityIds,
  labelOf,
  onHover,
  onOpen,
  onAddEntities,
}: Props) {
  const sources = useCanvasSources(spaceId, entityIds)
  const articles = sources.data ?? []

  return (
    <FloatingPanel
      title="Artykuły"
      aside={<span className="text-xs text-fg-subtle tabular-nums">{articles.length}</span>}
    >
      {sources.error && <p className="px-3 py-2 text-sm text-danger">{sources.error.message}</p>}
      {sources.isPending && entityIds.length > 0 && (
        <p className="px-3 py-2 text-sm text-fg-subtle">Szukam artykułów…</p>
      )}
      <ul className="divide-y divide-line-soft" onMouseLeave={() => onHover(null)}>
        {articles.map((a) => (
          <ArticleRow
            key={a.id}
            article={a}
            labelOf={labelOf}
            onHover={onHover}
            onOpen={() => onOpen(a.id)}
            onAddEntities={() => onAddEntities(a.id)}
          />
        ))}
      </ul>
    </FloatingPanel>
  )
}
