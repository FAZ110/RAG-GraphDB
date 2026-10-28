import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { freeSpot } from '@/components/canvas/placement'
import type {
  CanvasEdge,
  CanvasHandle,
  CanvasHighlight,
  CanvasNode,
} from '@/components/canvas/types'
import { fetchSubgraph, updateAnalysis } from '@/services/analyses'
import type { LoadedNode } from '@/types'
import type { Analysis, PlacedId, SourceArticle, Viewport } from '@/types/analysis'
import { candidates, visible } from './proposal/proposal'
import { tidyWay } from './dock/tidyWay'
import { useProposal } from './proposal/useProposal'
import {
  addition,
  changed,
  lastLabel,
  loadedDoc,
  movement,
  redone,
  removal,
  saved,
  settled,
  undone,
} from './state/canvasDoc'
import type { Placed } from './state/canvasDoc'
import { useAutosave } from './state/useAutosave'
import { useCanvasEdges } from './state/useCanvasEdges'

const DEFAULT_NAME = 'Nowa analiza'
const NO_ROUTE: ReadonlySet<string> = new Set()

const names = (nodes: readonly { name: string }[]) =>
  nodes.length > 2
    ? `${nodes[0].name} i ${nodes.length - 1} innych`
    : nodes.map((n) => n.name).join(', ')

export function useAnalysisEditor(
  spaceId: string,
  initial: Analysis | null,
  canvas: RefObject<CanvasHandle | null>,
  onCreated: (a: Analysis) => void
) {
  const queryClient = useQueryClient()
  const [doc, setDoc] = useState(() => loadedDoc(initial?.entities ?? []))
  const [name, setName] = useState(initial?.name ?? '')
  const [selection, setSelection] = useState<string[]>([])
  const [hoverId, setHoverId] = useState<string | null>(null)
  const [litArticle, setLitArticle] = useState<SourceArticle | null>(null)
  const [litGroup, setLitGroup] = useState<string | null>(null)
  const [hidden, setHidden] = useState<ReadonlySet<string>>(new Set())

  const ids = useMemo(() => [...doc.entities.keys()], [doc.entities])
  // Entities just added, settled into place once the canvas shows them.
  const toSettle = useRef<string[] | null>(null)
  useEffect(() => {
    const added = toSettle.current
    if (!added) return
    toSettle.current = null
    void canvas.current?.arrange(added).then((moves) => setDoc((d) => settled(d, moves)))
  }, [doc.entities, canvas])
  const edges = useCanvasEdges(spaceId, ids)
  const firstName = doc.entities.values().next().value?.node.name
  const proposal = useProposal(spaceId, () => ({
    onCanvas: doc.entities,
    viewCenter: canvas.current?.center() ?? { x: 0, y: 0 },
  }))

  const save = useAutosave({
    spaceId,
    analysis: initial && {
      id: initial.id,
      revision: initial.revision,
      savedAt: initial.updated_at,
    },
    doc,
    name: name || firstName || DEFAULT_NAME,
    onSaved: (sent) => setDoc((d) => saved(d, sent)),
    onCreated: (created) => {
      setName(created.name)
      void queryClient.invalidateQueries({ queryKey: ['analyses'] })
      onCreated(created)
    },
  })

  const rename = useMutation({
    mutationFn: (next: string) => updateAnalysis(spaceId, save.id!, { name: next }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['analyses'] }),
  })

  // Entities taken off the canvas, e.g. by undo, drop out of the selection.
  const selected = selection.filter((id) => doc.entities.has(id))
  const selectedPlaced = selected.map((id) => doc.entities.get(id)!)
  const view = proposal.view
  const ghosts = useMemo(() => (view ? visible(view) : []), [view])

  const nodes = useMemo<CanvasNode[]>(() => {
    const fresh = new Map(edges.data?.nodes.map((n) => [n.id, n.degree]))
    const placed = [...doc.entities.values()].map(({ node, x, y }) => ({
      id: node.id,
      name: node.name,
      label: node.label,
      degree: fresh.get(node.id) ?? node.degree,
      x,
      y,
    }))
    const spots = view?.proposal.spots
    const proposed = ghosts.map((n) => ({ ...n, ...spots!.get(n.id)!, ghost: true }))
    return [...placed, ...proposed]
  }, [doc.entities, edges.data, ghosts, view])

  const canvasEdges = useMemo<CanvasEdge[]>(() => {
    const solid = edges.data?.edges ?? initial?.edges ?? []
    const known = new Set(solid.map((e) => e.id))
    const shown = new Set(ghosts.map((g) => g.id))
    const reaches = (id: string) => doc.entities.has(id) || shown.has(id)
    const dashed = (view?.proposal.edges ?? [])
      .filter((e) => !known.has(e.id) && reaches(e.source) && reaches(e.target))
      .filter((e) => shown.has(e.source) || shown.has(e.target))
      .map((e) => ({ ...e, ghost: true }))
    const unique = new Map([...solid, ...dashed].map((e) => [e.id, e]))
    return [...unique.values()]
  }, [edges.data, initial, ghosts, view, doc.entities])

  const highlight = useMemo<CanvasHighlight>(() => {
    const route = view?.proposal.route ?? NO_ROUTE
    let lit: Set<string> | null = null
    const members = view?.proposal.memberOf
    if (litGroup && members) {
      // A group's ghosts with the edges that bring them, and the entity at their other end.
      lit = new Set(ghosts.filter((g) => members.get(g.id)?.has(litGroup)).map((g) => g.id))
      for (const e of canvasEdges) {
        if (!lit.has(e.source) && !lit.has(e.target)) continue
        lit.add(e.id).add(e.source).add(e.target)
      }
    } else if (litArticle) {
      lit = new Set(litArticle.entity_ids)
      for (const e of canvasEdges) if (lit.has(e.source) && lit.has(e.target)) lit.add(e.id)
    } else if (hoverId) {
      lit = new Set([hoverId])
      for (const e of canvasEdges) {
        if (e.source !== hoverId && e.target !== hoverId) continue
        lit.add(e.id).add(e.source).add(e.target)
      }
    } else if (route.size) {
      lit = new Set(route)
    }
    return { lit, route, hiddenLabels: hidden }
  }, [litGroup, ghosts, litArticle, hoverId, canvasEdges, view, hidden])

  const types = useMemo(() => {
    const counts = new Map<string, number>()
    for (const { node } of doc.entities.values())
      counts.set(node.label, (counts.get(node.label) ?? 0) + 1)
    return [...counts]
      .map(([label, count]) => ({ label, count }))
      .toSorted((a, b) => b.count - a.count)
  }, [doc.entities])

  // Ghosts were already laid out where they would settle, so taking them moves nothing.
  const add = (added: LoadedNode[], spots: { x: number; y: number }[]) => {
    setDoc((d) => changed(d, addition(added, spots), `Dodano: ${names(added)}`))
    proposal.take(added.map((n) => n.id))
  }

  const acceptGhost = (id: string) => {
    const node = view?.proposal.nodes.find((n) => n.id === id)
    const spot = view?.proposal.spots.get(id)
    if (node && spot) add([node], [spot])
  }

  const acceptAll = () => {
    if (!view) return
    const all = candidates(view)
    add(
      all,
      all.map((n) => view.proposal.spots.get(n.id)!)
    )
    proposal.dismiss()
  }

  /** An entity picked by name lands in view, selected, its neighbours proposed if it is the first. */
  const place = async (id: string, known?: LoadedNode) => {
    if (doc.entities.has(id)) {
      setSelection([id])
      canvas.current?.fit([id])
      return
    }
    const node = known ?? (await fetchSubgraph(spaceId, [id])).nodes[0]
    if (!node) return
    const spot = freeSpot(canvas.current?.center() ?? { x: 0, y: 0 }, [...doc.entities.values()])
    toSettle.current = [id]
    setDoc((d) => changed(d, addition([node], [spot]), `Dodano: ${node.name}`))
    setSelection([id])
    if (doc.entities.size === 0) proposal.expand({ node, ...spot })
  }

  const remove = (removed: readonly string[]) => {
    if (!removed.length) return
    const gone = removed.map((id) => doc.entities.get(id)!.node)
    setDoc((d) => changed(d, removal(removed), `Usunięto: ${names(gone)}`))
    setSelection((s) => s.filter((id) => !removed.includes(id)))
  }

  return {
    doc,
    name: name || (save.id ? DEFAULT_NAME : firstName || DEFAULT_NAME),
    rename: (next: string) => {
      setName(next)
      if (save.id) rename.mutate(next)
    },
    save,
    canUndo: doc.past.length > 0,
    canRedo: doc.future.length > 0,
    lastChange: lastLabel(doc),
    undo: () => setDoc(undone),
    redo: () => setDoc(redone),
    nodes,
    ghosts,
    edges: canvasEdges,
    highlight,
    types,
    hidden,
    toggleType: (label: string) =>
      setHidden((h) => {
        const next = new Set(h)
        if (!next.delete(label)) next.add(label)
        return next
      }),
    selectType: (label: string) =>
      setSelection(
        [...doc.entities.values()].filter((p) => p.node.label === label).map((p) => p.node.id)
      ),
    selected,
    selectedPlaced,
    select: setSelection,
    selectAll: () => setSelection(ids),
    setHoverId,
    setLitArticle,
    setLitGroup,
    move: (moves: PlacedId[]) => setDoc((d) => changed(d, movement(d, moves), 'Przesunięto')),
    /** Lay out the selection, or with none the whole canvas, so nothing overlaps. */
    tidy: async () => {
      const moving =
        selection.length > 1 ? selection.filter((id) => doc.entities.has(id)) : undefined
      // All of it afresh untangles best; a selection settles among what stays put.
      const moves =
        (await (moving ? canvas.current?.arrange(moving) : canvas.current?.tidy(tidyWay.get()))) ??
        []
      setDoc((d) => changed(d, movement(d, moves), 'Uporządkowano'))
    },
    saveViewport: (viewport: Viewport) => {
      if (save.id) void updateAnalysis(spaceId, save.id, { viewport }).catch(() => {})
    },
    remove,
    place,
    proposal,
    acceptGhost,
    acceptAll,
    expand: (root?: Placed, group?: string) => {
      const from = root ?? (selectedPlaced.length === 1 ? selectedPlaced[0] : null)
      if (from) void proposal.expand(from, group)
    },
  }
}

export type AnalysisEditorState = ReturnType<typeof useAnalysisEditor>
