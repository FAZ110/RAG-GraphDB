import { useRef, useState } from 'react'
import {
  fetchCommon,
  fetchEntitiesOfType,
  fetchNeighbours,
  fetchPaths,
  fetchSubgraph,
} from '@/services/analyses'
import { fetchArticle } from '@/services/api'
import type { Point } from '@/types/analysis'
import type { Placed } from '../state/canvasDoc'
import {
  articleProposal,
  commonProposal,
  expandProposal,
  pathProposal,
  typeProposal,
} from './build'
import type { Context } from './build'
import { PAGE } from './proposal'
import type { Proposal, ProposalView } from './proposal'

/** The one proposal on the canvas at a time; a new lookup replaces it. */
export function useProposal(spaceId: string, context: () => Context) {
  const [view, setView] = useState<ProposalView | null>(null)
  const [looking, setLooking] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const latest = useRef(0)

  const run = async (title: string, load: () => Promise<Proposal>, group: string | null = null) => {
    const ticket = ++latest.current
    setLooking(title)
    setError(null)
    try {
      const proposal = await load()
      if (ticket === latest.current) setView({ proposal, group, shown: PAGE })
    } catch (e) {
      if (ticket === latest.current) setError((e as Error).message)
    } finally {
      if (ticket === latest.current) setLooking(null)
    }
  }

  return {
    view,
    looking,
    error,
    /** Neighbours of `root`, narrowed at once to `group` when one was picked. */
    expand: (root: Placed, group?: string) =>
      run(
        root.node.name,
        async () => expandProposal(root, await fetchNeighbours(spaceId, root.node.id), context()),
        group
      ),
    common: (selected: Placed[], label?: string) =>
      run('wspólne powiązania', async () =>
        commonProposal(
          selected,
          await fetchCommon(
            spaceId,
            selected.map((s) => s.node.id),
            label
          ),
          context()
        )
      ),
    path: (from: Placed, to: Placed) =>
      run('ścieżkę', async () =>
        pathProposal(from, to, await fetchPaths(spaceId, from.node.id, to.node.id), context())
      ),
    ofType: (label: string) =>
      run(label, async () =>
        typeProposal(label, (await fetchEntitiesOfType(spaceId, label)).nodes, context())
      ),
    fromArticle: (articleId: string) =>
      run('encje artykułu', async () => {
        const article = await fetchArticle(spaceId, articleId)
        const ids = article.entities.map((e) => e.id)
        const graph = ids.length ? await fetchSubgraph(spaceId, ids) : { nodes: [], edges: [] }
        return articleProposal(articleId, article.title || 'Artykuł bez tytułu', graph, context())
      }),
    setGroup: (group: string | null) => setView((v) => v && { ...v, group, shown: PAGE }),
    showMore: () => setView((v) => v && { ...v, shown: v.shown + PAGE }),
    /** Move ghosts to where the layout would settle them, so taking one moves nothing. */
    respot: (planned: ReadonlyMap<string, Point>) =>
      setView((v) => {
        if (!v || ![...planned.keys()].every((id) => v.proposal.spots.has(id))) return v
        const spots = new Map([...v.proposal.spots, ...planned])
        return { ...v, proposal: { ...v.proposal, spots } }
      }),
    /** Drop candidates that went onto the canvas; the proposal closes once none are left. */
    take: (ids: readonly string[]) =>
      setView((v) => {
        if (!v) return v
        const nodes = v.proposal.nodes.filter((n) => !ids.includes(n.id))
        return nodes.length ? { ...v, proposal: { ...v.proposal, nodes } } : null
      }),
    dismiss: () => {
      latest.current++
      setView(null)
      setLooking(null)
      setError(null)
    },
  }
}
