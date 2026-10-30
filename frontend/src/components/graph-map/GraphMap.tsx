import { EdgeCurvedArrowProgram } from '@sigma/edge-curve'
import { createNodeBorderProgram } from '@sigma/node-border'
import { useEffect, useEffectEvent, useImperativeHandle, useRef } from 'react'
import type { Ref } from 'react'
import Sigma from 'sigma'
import type { Coordinates, EdgeDisplayData, NodeDisplayData } from 'sigma/types'
import { canvasMotion } from '@/components/canvas/motion'
import { relationName } from '@/components/canvas/relationName'
import type { Insets } from '@/components/canvas/types'
import type { OverviewResponse } from '@/types'
import { buildGraph, CURVED, syncGraph } from './buildGraph'
import type { MapGraph } from './buildGraph'
import { runLayout } from './layout'
import { followPaper } from './paper'
import { communityInk, labelDrawers, mix, paperColors } from './style'
import type { ColorBy, MapEdgeAttributes, MapHandle, MapNodeAttributes } from './types'

interface Props {
  data: OverviewResponse
  colorBy: ColorBy
  hiddenKinds: ReadonlySet<string>
  highlighted: ReadonlySet<string>
  selectedId: string | null
  selectedEdgeId: string | null
  onSelect: (id: string | null) => void
  onSelectEdge: (id: string) => void
  onLayout?: (running: boolean, interrupted?: boolean) => void
  insets?: () => Insets
  ref?: Ref<MapHandle>
}

const FOCUS_RATIO = 0.25
const DIM = 0.85
const LOOSE = 0.6
const SELECTED_RING = 2
const PAPER_RING = 1.5
const HIDE_EDGES_ON_MOVE_FROM = 10_000
const FORCED_LABELS = 12
const EDGE_HIT_PX = 6
const SELECTED_EDGE = 2
const UNCOVERED: Insets = { top: 0, right: 0, bottom: 0, left: 0 }

type NodeView = Partial<NodeDisplayData> & { ring?: number }

interface View {
  colorBy: ColorBy
  hiddenKinds: ReadonlySet<string>
  highlighted: ReadonlySet<string>
  selectedId: string | null
  selectedEdgeId: string | null
  hovered: string | null
}

function focusIn(v: View): string | null {
  return v.hovered ?? (v.highlighted.size ? null : v.selectedId)
}

function neighbourhood(graph: MapGraph, id: string | null): Set<string> | null {
  if (!id || !graph.hasNode(id)) return null
  return new Set([id, ...graph.neighbors(id)])
}

const CURVE_SAMPLES = 16

function toCurve(x: number, y: number, a: Coordinates, b: Coordinates, curvature: number): number {
  const control = {
    x: (a.x + b.x) / 2 + (b.y - a.y) * curvature,
    y: (a.y + b.y) / 2 - (b.x - a.x) * curvature,
  }
  let nearest = Infinity
  let previous = a
  for (let i = 1; i <= CURVE_SAMPLES; i++) {
    const t = i / CURVE_SAMPLES
    const point = {
      x: (1 - t) ** 2 * a.x + 2 * (1 - t) * t * control.x + t ** 2 * b.x,
      y: (1 - t) ** 2 * a.y + 2 * (1 - t) * t * control.y + t ** 2 * b.y,
    }
    nearest = Math.min(nearest, toSegment(x, y, previous, point))
    previous = point
  }
  return nearest
}

function toSegment(x: number, y: number, a: Coordinates, b: Coordinates): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const length = dx * dx + dy * dy
  const t = length ? Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / length)) : 0
  return Math.hypot(x - (a.x + t * dx), y - (a.y + t * dy))
}

function edgeNear(
  sigma: Sigma<MapNodeAttributes, MapEdgeAttributes>,
  graph: MapGraph,
  x: number,
  y: number
): string | null {
  let best: string | null = null
  let distance = EDGE_HIT_PX
  graph.forEachEdge((id, attrs, source, target) => {
    if (sigma.getEdgeDisplayData(id)?.hidden) return
    const a = sigma.getNodeDisplayData(source)
    const b = sigma.getNodeDisplayData(target)
    if (!a || !b) return
    const from = sigma.framedGraphToViewport(a)
    const to = sigma.framedGraphToViewport(b)
    const d =
      attrs.type === CURVED
        ? toCurve(x, y, from, to, attrs.curvature ?? 0)
        : toSegment(x, y, from, to)
    if (d < distance) {
      distance = d
      best = id
    }
  })
  return best
}

function litIn(graph: MapGraph, v: View): Set<string> | null {
  if (!v.hovered && !v.highlighted.size && v.selectedEdgeId && graph.hasEdge(v.selectedEdgeId)) {
    return new Set(graph.extremities(v.selectedEdgeId))
  }
  return neighbourhood(graph, focusIn(v))
}

export function GraphMap({
  data,
  colorBy,
  hiddenKinds,
  highlighted,
  selectedId,
  selectedEdgeId,
  onSelect,
  onSelectEdge,
  onLayout,
  insets,
  ref,
}: Props) {
  const container = useRef<HTMLDivElement>(null)
  const sigmaRef = useRef<Sigma<MapNodeAttributes, MapEdgeAttributes> | null>(null)
  const view = useRef<View>({
    colorBy,
    hiddenKinds,
    highlighted,
    selectedId,
    selectedEdgeId,
    hovered: null,
  })
  const lit = useRef<Set<string> | null>(null)
  const tidyRef = useRef(() => {})

  const emitSelect = useEffectEvent((id: string | null) => onSelect(id))
  const emitSelectEdge = useEffectEvent((id: string) => onSelectEdge(id))
  const initialData = useEffectEvent(() => data)
  const emitLayout = useEffectEvent((running: boolean, interrupted = false) =>
    onLayout?.(running, interrupted)
  )
  const insetsRef = useRef(insets)
  useEffect(() => {
    insetsRef.current = insets
  })
  const coveredNow = () => insetsRef.current?.() ?? UNCOVERED

  useEffect(() => {
    const paper = paperColors()
    const graph = buildGraph(initialData(), paper.faint)
    const dimEdge = mix(paper.faint, paper.page, DIM)
    const { drawLabel, drawHover } = labelDrawers(paper)
    const font = getComputedStyle(document.body).fontFamily
    let dragged: string | null = null

    const focusOf = () => focusIn(view.current)
    const relight = () => {
      lit.current = litIn(graph, view.current)
    }

    const sigma = new Sigma<MapNodeAttributes, MapEdgeAttributes>(graph, container.current!, {
      defaultNodeType: 'bordered',
      nodeProgramClasses: {
        bordered: createNodeBorderProgram({
          borders: [
            {
              size: { attribute: 'ring', defaultValue: 0, mode: 'pixels' },
              color: { value: paper.fg },
            },
            { size: { value: PAPER_RING, mode: 'pixels' }, color: { value: paper.page } },
            { size: { fill: true }, color: { attribute: 'color' } },
          ],
        }),
      },
      defaultEdgeType: 'arrow',
      edgeProgramClasses: { [CURVED]: EdgeCurvedArrowProgram },
      renderEdgeLabels: true,
      labelFont: font,
      labelSize: 11,
      labelWeight: '600',
      labelColor: { color: paper.fg },
      edgeLabelFont: font,
      edgeLabelSize: 9,
      edgeLabelColor: { color: paper.subtle },
      defaultDrawNodeLabel: drawLabel,
      defaultDrawNodeHover: (context, data, settings) => {
        if (!dragged || data.key === dragged) drawHover(context, data, settings)
      },
      labelDensity: 0.6,
      labelGridCellSize: 110,
      labelRenderedSizeThreshold: 3,
      zIndex: true,
      stagePadding: 40,
      minCameraRatio: 0.03,
      maxCameraRatio: 4,
      hideEdgesOnMove: graph.size >= HIDE_EDGES_ON_MOVE_FROM,
      nodeReducer: (id, attrs) => {
        const v = view.current
        const out: NodeView = { ...attrs }
        if (v.hiddenKinds.has(attrs.kind)) return { ...out, hidden: true }
        if (v.colorBy === 'community') out.color = communityInk(attrs.community)
        const shown = lit.current ?? (v.highlighted.size ? v.highlighted : null)
        if (shown && !shown.has(id)) {
          out.color = mix(out.color!, paper.page, DIM)
          out.label = null
          out.zIndex = 0
        } else if (shown) {
          out.zIndex = 1
          out.forceLabel = !lit.current && v.highlighted.size <= FORCED_LABELS
        } else if (attrs.degree === 0) {
          out.color = mix(out.color!, paper.page, LOOSE)
        }
        if (id === v.hovered) out.forceLabel = true
        if (id === v.selectedId) {
          out.ring = SELECTED_RING
          out.zIndex = 2
          out.forceLabel = true
        }
        return out
      },
      edgeReducer: (id, attrs) => {
        const v = view.current
        const out: Partial<EdgeDisplayData> = { ...attrs, label: null }
        const [source, target] = graph.extremities(id)
        if (
          v.hiddenKinds.has(graph.getNodeAttribute(source, 'kind')) ||
          v.hiddenKinds.has(graph.getNodeAttribute(target, 'kind'))
        ) {
          return { ...out, hidden: true }
        }
        if (id === v.selectedEdgeId) {
          return {
            ...out,
            color: paper.fg,
            size: SELECTED_EDGE,
            label: relationName(attrs.relation),
            zIndex: 2,
          }
        }
        const focus = focusOf()
        if (focus) {
          if (source === focus || target === focus) {
            out.color = paper.subtle
            out.label = relationName(attrs.relation)
            out.zIndex = 1
          } else {
            out.color = dimEdge
          }
        } else if (v.selectedEdgeId && !v.highlighted.size) {
          out.color = dimEdge
        } else if (v.highlighted.size) {
          if (!(v.highlighted.has(source) && v.highlighted.has(target))) out.color = dimEdge
          else if (source === v.selectedId || target === v.selectedId) {
            out.label = relationName(attrs.relation)
            out.zIndex = 1
          }
        }
        return out
      },
    })
    sigmaRef.current = sigma

    let moved = false
    let under: string | null = null
    let layingOut = true
    let stopLayout = () => {}
    const cursor = (value: string) => (container.current!.style.cursor = value)

    sigma.on('downNode', ({ node }) => {
      dragged = node
      moved = false
      if (layingOut) {
        stopLayout()
        layingOut = false
        emitLayout(false, true)
      }
      if (!sigma.getCustomBBox()) sigma.setCustomBBox(sigma.getBBox())
      cursor('grabbing')
      view.current.hovered = node
      relight()
      sigma.refresh({ skipIndexation: true })
    })
    sigma.on('moveBody', ({ event }) => {
      if (!dragged) return
      const { x, y } = sigma.viewportToGraph(event)
      graph.mergeNodeAttributes(dragged, { x, y })
      moved = true
      event.preventSigmaDefault()
      event.original.preventDefault()
      event.original.stopPropagation()
    })
    const drop = () => {
      if (!dragged) return
      dragged = null
      hover(under)
    }
    sigma.on('upNode', drop)
    sigma.on('upStage', drop)

    sigma.on('clickNode', ({ node }) => {
      if (moved) return void (moved = false)
      emitSelect(node)
    })
    sigma.on('clickStage', ({ event }) => {
      if (moved) return void (moved = false)
      const edge = edgeNear(sigma, graph, event.x, event.y)
      if (edge) emitSelectEdge(edge)
      else emitSelect(null)
    })
    const hover = (node: string | null) => {
      under = node
      if (dragged) return
      view.current.hovered = node
      relight()
      cursor(node ? 'pointer' : '')
      sigma.refresh({ skipIndexation: true })
    }
    sigma.on('enterNode', ({ node }) => hover(node))
    sigma.on('leaveNode', () => hover(null))

    relight()
    const stopPaper = followPaper(sigma, container.current!)
    const layout = () => {
      stopLayout()
      layingOut = true
      emitLayout(true)
      stopLayout = runLayout(graph, () => {
        layingOut = false
        emitLayout(false)
      })
    }
    tidyRef.current = () => {
      sigma.setCustomBBox(null)
      layout()
    }
    layout()

    return () => {
      stopLayout()
      stopPaper()
      sigma.kill()
      sigmaRef.current = null
    }
  }, [])

  useEffect(() => {
    const sigma = sigmaRef.current
    if (!sigma) return
    const graph = sigma.getGraph() as MapGraph
    syncGraph(graph, data, paperColors().faint)
    lit.current = litIn(graph, view.current)
    sigma.refresh()
  }, [data])

  useEffect(() => {
    view.current = {
      ...view.current,
      colorBy,
      hiddenKinds,
      highlighted,
      selectedId,
      selectedEdgeId,
    }
    const sigma = sigmaRef.current
    if (!sigma) return
    lit.current = litIn(sigma.getGraph() as MapGraph, view.current)
    sigma.refresh({ skipIndexation: true })
  }, [colorBy, hiddenKinds, highlighted, selectedId, selectedEdgeId])

  useImperativeHandle(ref, () => {
    const motion = () => ({ duration: canvasMotion('panel').duration, easing: 'cubicOut' as const })
    const frame = (x: number, y: number, ratio: number) => {
      const sigma = sigmaRef.current
      if (!sigma) return
      const { width, height } = sigma.getDimensions()
      const cover = coveredNow()
      const openX = (cover.left + width - cover.right) / 2
      const openY = (cover.top + height - cover.bottom) / 2
      const centre = sigma.viewportToFramedGraph(
        { x: width - openX, y: height - openY },
        { cameraState: { x, y, ratio, angle: 0 } }
      )
      void sigma.getCamera().animate({ ...centre, ratio }, motion())
    }
    return {
      fit: () => {
        const sigma = sigmaRef.current
        if (!sigma) return
        const { width, height } = sigma.getDimensions()
        const cover = coveredNow()
        const shrink = Math.max(
          width / Math.max(width - cover.left - cover.right, 1),
          height / Math.max(height - cover.top - cover.bottom, 1)
        )
        frame(0.5, 0.5, shrink)
      },
      zoomBy: (factor) => void sigmaRef.current?.getCamera().animatedZoom({ factor, ...motion() }),
      focus: (id) => {
        const sigma = sigmaRef.current
        const node = sigma?.getNodeDisplayData(id)
        if (!sigma || !node) return
        frame(node.x, node.y, Math.min(sigma.getCamera().getState().ratio, FOCUS_RATIO))
      },
      tidy: () => tidyRef.current(),
    }
  }, [])

  return <div ref={container} className="h-full w-full" />
}
