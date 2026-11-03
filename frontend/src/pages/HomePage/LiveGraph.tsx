import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { focusRing, surface } from '@/components/deck'
import type { ArtNode } from '@/components/graph-art/InteractiveGraph'
import { InteractiveGraph } from '@/components/graph-art/InteractiveGraph'
import { typeName } from '@/components/Spaces/spaceText'
import { inkFor } from '@/design/inks'
import { cn } from '@/lib/utils'
import { fetchGraphSeed, fetchNeighbours } from '@/services/api'
import type { GraphChunk, Space } from '@/types'
import { SectionLabel } from './SectionLabel'

const NEIGHBOURS = 12
const HUBS = 3
const LEAVES = 5

// The top entities by degree rarely link to each other, so a picture of only them falls
// apart; a neighbourhood is connected by construction.
async function neighbourhood(spaceId: string): Promise<GraphChunk | null> {
  const [root] = (await fetchGraphSeed(spaceId, 1)).nodes
  if (!root) return null
  const first = await fetchNeighbours(spaceId, root.id, NEIGHBOURS)
  const hubs = first.nodes.slice(0, HUBS)
  const rest = await Promise.all(hubs.map((h) => fetchNeighbours(spaceId, h.id, LEAVES)))
  const parts = [first, ...rest]
  return {
    nodes: [...new Map([root, ...parts.flatMap((p) => p.nodes)].map((n) => [n.id, n])).values()],
    edges: [...new Map(parts.flatMap((p) => p.edges).map((e) => [e.id, e])).values()],
  }
}

function drawing({ nodes, edges }: GraphChunk) {
  // A node with no edge drawn would only drift alone to the edge of the frame.
  const linked = new Set(edges.flatMap((e) => (e.source === e.target ? [] : [e.source, e.target])))
  const byDegree = nodes.filter((n) => linked.has(n.id)).toSorted((a, b) => b.degree - a.degree)
  const index = new Map(byDegree.map((n, i) => [n.id, i]))
  const art: ArtNode[] = byDegree.map((n, i) => {
    const group = i === 0 ? 0 : i <= HUBS + 2 ? 1 : 2
    return {
      id: i,
      group,
      r: [16, 10, 6][group],
      color: inkFor(n.label).color,
      title: `${n.name} · ${typeName(n.label)}`,
    }
  })
  const links = edges.flatMap((e): Array<[number, number]> => {
    const s = index.get(e.source)
    const t = index.get(e.target)
    return s === undefined || t === undefined || s === t ? [] : [[s, t]]
  })
  return { art, links }
}

export function LiveGraph({ space }: { space: Pick<Space, 'id' | 'name'> }) {
  // Outside the `spaces` key, so a running upload doesn't refetch it under a drawing that
  // reads its nodes only once.
  const seed = useQuery({
    queryKey: ['home-graph', space.id],
    queryFn: () => neighbourhood(space.id),
  })
  const graph = useMemo(() => seed.data && drawing(seed.data), [seed.data])

  return (
    <section className={cn(surface, 'deck-land relative flex min-h-80 flex-col p-4')}>
      <SectionLabel
        action={
          <Link
            to={`/graph/${space.id}`}
            className={cn('text-xs font-medium text-fg-subtle hover:text-fg', focusRing)}
          >
            Otwórz graf →
          </Link>
        }
      >
        Twój graf · {space.name}
      </SectionLabel>
      <div className="flex-1">
        {graph && <InteractiveGraph key={space.id} nodes={graph.art} links={graph.links} />}
      </div>
      <p className="text-xs text-fg-subtle">
        Najlepiej połączona encja wybranej przestrzeni i jej otoczenie.
      </p>
    </section>
  )
}
