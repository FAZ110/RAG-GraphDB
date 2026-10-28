import { useQuery } from '@tanstack/react-query'
import { Swatch, focusRing } from '@/components/deck'
import { relationName } from '@/components/canvas/relationName'
import { typeName } from '@/components/Spaces/spaceText'
import { inkFor } from '@/design/inks'
import { cn } from '@/lib/utils'
import { fetchRelationGroups } from '@/services/analyses'
import type { RelationGroup } from '@/types/analysis'

interface Props {
  spaceId: string
  nodeId: string
  onExpand: (group: RelationGroup) => void
}

/** What the entity links to, per relation and type; each row brings that group as ghosts. */
export function RelationGroups({ spaceId, nodeId, onExpand }: Props) {
  const groups = useQuery({
    queryKey: ['analysis', spaceId, 'relations', nodeId],
    queryFn: () => fetchRelationGroups(spaceId, nodeId),
  })
  if (groups.isPending) return <p className="px-3 py-2 text-sm text-fg-subtle">Liczę powiązania…</p>
  if (groups.error) return <p className="px-3 py-2 text-sm text-danger">{groups.error.message}</p>
  if (!groups.data.length) return <p className="px-3 py-2 text-sm text-fg-subtle">Brak powiązań</p>

  return (
    <ul className="pb-1">
      {groups.data.map((g) => {
        const kind = (
          <span className="inline-flex items-center gap-1 font-medium text-fg">
            <Swatch color={inkFor(g.label).color} className="size-2 rounded-full" />
            {typeName(g.label)}
          </span>
        )
        const relation = <span className="text-fg-muted">{relationName(g.type)}</span>
        return (
          <li key={`${g.direction}:${g.type}:${g.label}`}>
            <button
              type="button"
              onClick={() => onExpand(g)}
              className={cn(
                'flex w-full items-baseline gap-2 px-3 py-1.5 text-left text-sm hover:bg-surface-sunken',
                focusRing
              )}
            >
              {/* A sentence about the entity: "Zawodnik strzelił gola w" it, or it "wygrał w Klub". */}
              <span className="min-w-0 flex-1">
                {g.direction === 'in' ? (
                  <>
                    {kind} {relation}
                  </>
                ) : (
                  <>
                    {relation} {kind}
                  </>
                )}
              </span>
              <span className="text-xs text-fg-subtle tabular-nums">{g.count}</span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
