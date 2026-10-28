import cytoscape from 'cytoscape'
import type { Core, ElementDefinition, NodeSingular } from 'cytoscape'
import { useEffect, useEffectEvent, useImperativeHandle, useRef } from 'react'
import type { Ref } from 'react'
import type { PlacedId, Point, Viewport } from '@/types/analysis'
import { arrange, planGhosts } from './arrange'
import { basicTidy } from './basicTidy'
import { tidy } from './tidy'
import { canvasStyle, sizeFor } from './canvasStyle'
import { inkColors } from './inkColors'
import { canvasMotion } from './motion'
import { followExpandMarks } from './expandMarks'
import { followPaper } from './paper'
import { relationName } from './relationName'
import { routeEdges } from './router'
import { unbendAround } from './routes'
import type { CanvasEdge, CanvasHandle, CanvasHighlight, CanvasNode, Insets } from './types'
import { framing, openArea, revealViewport } from './reveal'

interface Props {
  nodes: CanvasNode[]
  edges: CanvasEdge[]
  selected: readonly string[]
  highlight: CanvasHighlight
  initialViewport?: Viewport | null
  onSelect: (ids: string[]) => void
  onGhostClick: (id: string) => void
  onHover: (id: string | null) => void
  onMove: (moves: PlacedId[]) => void
  onViewport?: (viewport: Viewport) => void
  /** How much of the canvas panels cover now; fitting and centring keep to the rest. */
  insets: () => Insets
  ref?: Ref<CanvasHandle>
}

// A handful of nodes fitted to the view would fill it; they stay at a readable size instead.
const FIT_MAX_ZOOM = 1.3
const VIEWPORT_SETTLE_MS = 500
// Long enough for a burst of changes, like an undo or a batch of additions, to route once.
const ROUTE_SETTLE_MS = 150

const sameSet = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((id) => b.includes(id))

/** The middle of the part of the view no panel covers, in rendered pixels. */
function openCenter(cy: Core, insets: Insets) {
  const area = openArea(cy, insets)
  return { x: (area.left + area.right) / 2, y: (area.top + area.bottom) / 2 }
}

function nodeData(node: CanvasNode) {
  return {
    id: node.id,
    name: node.name,
    degree: node.degree,
    size: sizeFor(node.degree),
    ...inkColors(node.label),
  }
}

export function GraphCanvas({
  nodes,
  edges,
  selected,
  highlight,
  initialViewport,
  onSelect,
  onGhostClick,
  onHover,
  onMove,
  onViewport,
  insets,
  ref,
}: Props) {
  const container = useRef<HTMLDivElement>(null)
  const marks = useRef<HTMLDivElement>(null)
  const cyRef = useRef<Core | null>(null)
  const placedOnce = useRef(false)
  // Asks for the edges to be routed again once the canvas has stopped changing.
  const reroute = useRef<() => void>(() => {})

  const emitSelect = useEffectEvent((ids: string[]) => {
    if (!sameSet(ids, selected)) onSelect(ids)
  })
  const emitGhost = useEffectEvent((id: string) => onGhostClick(id))
  const emitHover = useEffectEvent((id: string | null) => onHover(id))
  const emitMove = useEffectEvent((moves: PlacedId[]) => onMove(moves))
  const emitViewport = useEffectEvent((v: Viewport) => onViewport?.(v))
  const coveredNow = useEffectEvent(() => insets())

  useEffect(() => {
    const cy = cytoscape({
      container: container.current,
      style: canvasStyle(),
      layout: { name: 'preset' },
      minZoom: 0.08,
      maxZoom: 3,
      wheelSensitivity: 0.35,
      boxSelectionEnabled: true,
    })
    cyRef.current = cy
    let routing = 0
    reroute.current = () => {
      clearTimeout(routing)
      routing = window.setTimeout(() => routeEdges(cy), ROUTE_SETTLE_MS)
    }
    const stopPaper = followPaper(cy, container.current!)
    const stopMarks = followExpandMarks(cy, marks.current!)

    // Selection and drags come in one event per node; each settles into one update per frame.
    let frame = 0
    const moves = new Map<string, PlacedId>()
    const flush = () => {
      frame = 0
      emitSelect(cy.nodes(':selected').map((n) => n.id()))
      if (moves.size) emitMove([...moves.values()])
      moves.clear()
    }
    const schedule = () => {
      frame ||= requestAnimationFrame(flush)
    }
    let settle = 0

    cy.on('select unselect', 'node', schedule)
    cy.on('tap', 'node.ghost', (e) => emitGhost(e.target.id()))
    cy.on('mouseover', 'node', (e) => emitHover(e.target.id()))
    cy.on('mouseout', 'node', () => emitHover(null))
    // A dragged node's edges straighten while it moves and are routed again where it lands.
    cy.on('grab', 'node', (e) => unbendAround(cy, e.target))
    cy.on('dragfree', 'node', (e) => {
      reroute.current()
      const { x, y } = e.target.position()
      moves.set(e.target.id(), { id: e.target.id(), x, y })
      schedule()
    })
    cy.on('viewport', () => {
      clearTimeout(settle)
      settle = window.setTimeout(() => {
        const { x, y } = cy.pan()
        emitViewport({ x, y, zoom: cy.zoom() })
      }, VIEWPORT_SETTLE_MS)
    })

    return () => {
      stopPaper()
      stopMarks()
      clearTimeout(routing)
      cancelAnimationFrame(frame)
      clearTimeout(settle)
      cy.destroy()
    }
  }, [])

  useEffect(() => {
    const cy = cyRef.current!
    const wanted = new Set([...nodes.map((n) => n.id), ...edges.map((e) => e.id)])
    const added: ElementDefinition[] = []
    const gliding: [NodeSingular, Point][] = []

    cy.batch(() => {
      cy.elements().forEach((el) => {
        if (!wanted.has(el.id())) el.remove()
      })
      for (const node of nodes) {
        const el = cy.getElementById(node.id)
        if (el.empty()) {
          added.push({
            group: 'nodes',
            data: nodeData(node),
            position: { x: node.x, y: node.y },
            classes: node.ghost ? 'ghost' : '',
            selectable: !node.ghost,
            grabbable: !node.ghost,
          })
          continue
        }
        el.data(nodeData(node))
        if (el.hasClass('ghost') !== Boolean(node.ghost)) {
          el.toggleClass('ghost', node.ghost)
          if (node.ghost) el.unselectify().ungrabify()
          else el.selectify().grabify()
        }
        const p = el.position()
        if (el.grabbed() || (p.x === node.x && p.y === node.y)) continue
        // A ghost moving to where the layout planned it glides there; anything else jumps.
        if (node.ghost) gliding.push([el, { x: node.x, y: node.y }])
        else el.position({ x: node.x, y: node.y })
      }
      const ids = new Set(nodes.map((n) => n.id))
      for (const edge of edges) {
        if (!ids.has(edge.source) || !ids.has(edge.target)) continue
        const el = cy.getElementById(edge.id)
        if (el.empty()) {
          added.push({
            group: 'edges',
            data: { ...edge, name: relationName(edge.type) },
            classes: edge.ghost ? 'ghost' : '',
          })
        } else {
          el.toggleClass('ghost', Boolean(edge.ghost))
        }
      }
    })

    const fresh = cy.add(added)
    for (const [el, to] of gliding) {
      el.stop().animate({ position: to }, canvasMotion('panel'))
    }
    reroute.current()
    if (!placedOnce.current) {
      if (!nodes.length) return
      placedOnce.current = true
      if (initialViewport) {
        cy.viewport({
          zoom: initialViewport.zoom,
          pan: { x: initialViewport.x, y: initialViewport.y },
        })
      } else {
        cy.viewport(framing(cy, cy.nodes(), coveredNow(), FIT_MAX_ZOOM))
      }
      return
    }
    // Later arrivals fade in where they land; nothing else moves.
    fresh
      .nodes()
      .style('opacity', 0)
      .animate({ style: { opacity: 1 } }, canvasMotion('quick', true))
  }, [nodes, edges, initialViewport])

  useEffect(() => {
    const cy = cyRef.current!
    const { lit, route, hiddenLabels } = highlight
    const labelOf = new Map(nodes.map((n) => [n.id, n.label]))
    cy.batch(() => {
      cy.nodes().forEach((n) => {
        n.toggleClass('hidden', hiddenLabels.has(labelOf.get(n.id()) ?? ''))
        n.toggleClass('dim', lit !== null && !lit.has(n.id()))
      })
      const shown = cy.nodes().not('.ghost').not('.hidden')
      shown.forEach((n) => {
        n.toggleClass('loose', n.edgesWith(shown.not(n)).empty())
      })
      // Relations it has in the space beyond those drawn here: there is more to expand, and a
      // plus over it says so.
      cy.nodes()
        .not('.ghost')
        .forEach((n) => {
          const drawn = n.connectedEdges().not('.ghost').length
          n.toggleClass('expandable', n.data('degree') > drawn)
        })
      cy.edges().forEach((e) => {
        const isLit = lit?.has(e.id()) ?? false
        e.toggleClass('dim', lit !== null && !isLit)
        e.toggleClass('lit', isLit && !route.has(e.id()))
        e.toggleClass('route', route.has(e.id()))
      })
    })
  }, [highlight, nodes, edges])

  useEffect(() => {
    const cy = cyRef.current!
    const current = cy.nodes(':selected').map((n) => n.id())
    if (sameSet(current, selected)) return
    cy.batch(() => {
      cy.nodes(':selected').unselect()
      cy.nodes()
        .filter((n) => selected.includes(n.id()))
        .select()
    })
  }, [selected])

  useImperativeHandle(ref, () => ({
    fit: (ids) => {
      const cy = cyRef.current!
      const target = ids?.length ? cy.nodes().filter((n) => ids.includes(n.id())) : cy.nodes()
      if (target.nonempty()) {
        cy.animate(framing(cy, target, insets(), FIT_MAX_ZOOM), canvasMotion('panel'))
      }
    },
    reveal: (ids) => {
      const cy = cyRef.current!
      const target = revealViewport(cy, ids, insets())
      if (target) cy.animate(target, canvasMotion('panel'))
    },
    zoomBy: (factor) => {
      const cy = cyRef.current!
      cy.animate(
        {
          zoom: {
            level: cy.zoom() * factor,
            renderedPosition: openCenter(cy, insets()),
          },
        },
        canvasMotion('quick')
      )
    },
    center: () => {
      const cy = cyRef.current!
      const at = openCenter(cy, insets())
      const pan = cy.pan()
      return { x: (at.x - pan.x) / cy.zoom(), y: (at.y - pan.y) / cy.zoom() }
    },
    arrange: async (moving) => {
      const moves = await arrange(cyRef.current!, moving)
      reroute.current()
      return moves
    },
    tidy: async (way = 'refined') => {
      const cy = cyRef.current!
      const moves = await (way === 'basic' ? basicTidy(cy) : tidy(cy))
      reroute.current()
      return moves
    },
    plan: (ids) => planGhosts(cyRef.current!, ids),
    viewport: () => {
      const cy = cyRef.current!
      return { ...cy.pan(), zoom: cy.zoom() }
    },
  }))

  // Cytoscape makes its container `position: relative`, so the placement sits on a wrapper.
  return (
    <div className="absolute inset-0">
      <div ref={container} className="size-full bg-page" />
      <div ref={marks} className="pointer-events-none absolute inset-0 overflow-hidden" />
    </div>
  )
}
