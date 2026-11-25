import { ScanSearchIcon } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useEffect, useEffectEvent, useId, useRef, useState } from 'react'
import type { CSSProperties, MouseEvent, PointerEvent } from 'react'
import { focusRing } from '@/components/deck/styles'
import { pluralForm } from '@/components/Spaces/spaceText'
import { inkFor } from '@/design/inks'
import { fade, pop } from '@/design/motion'
import { useElementSize } from '@/hooks/useElementSize'
import { cn } from '@/lib/utils'
import type { Direction } from '@/types/query'
import { NODE_H, NODE_W, boxEdge } from './layout'
import { Letter } from './Letter'
import { useLetters } from './letters'
import { linkColor, linkDash, linkText } from './linkLook'
import type { Point } from './layout'
import { caption, nodeTitle, SOUGHT } from './names'
import type { Pattern } from './pattern'
import { connect, labelOf, loose, moveNode } from './pattern'

// Sheets drawn behind a group of known entities, and how far each sits from the next.
const STACK = 2
const SHEET = 4
// Room between a line's end and the node's border, so heads do not touch it.
const GAP = 4
// How far a head reaches past the end of its line, from its notch to its tip.
const HEAD_BODY = 9
// Line colours an arrow head comes in, as `linkColor` draws the lines.
const HEADS = { off: 'var(--fg-subtle)', on: 'var(--fg)', not: 'var(--danger)' }
const MATCH_FORMS = { one: 'wynik', few: 'wyniki', many: 'wyników' }
// A press that travels less than this is a click, not a drag.
const DRAG_PX = 4
// The dots of the analysis paper, so the question reads as a small canvas.
const PAPER: CSSProperties = {
  backgroundImage: 'radial-gradient(var(--line) 1px, transparent 1px)',
  backgroundSize: '20px 20px',
}

interface Drag {
  mode: 'move' | 'link'
  key: string
  start: Point
  at: Point
  moved: boolean
}

/** Sought nodes to pick out, each with the entity to show in it, e.g. a hovered match's. */
export type Lit = ReadonlyMap<string, string | null>

interface Props {
  pattern: Pattern
  /** Matches per sought node, shown on it; undefined while there is no answer. */
  counts: Record<string, number> | undefined
  /** The part whose settings are open. */
  selected: string | null
  lit: Lit | null
  /** Linking by clicking two nodes, switched on from the toolbar. */
  linking: boolean
  onLinking: (on: boolean) => void
  onSelect: (key: string | null) => void
  onChange: (next: Pattern, select?: string | null) => void
}

/** The question as a small graph the user draws: nodes from the toolbar, links by dragging. */
export function PatternStage(props: Props) {
  const { pattern, selected, counts, lit, linking, onLinking, onSelect, onChange } = props
  const [measure, size] = useElementSize<HTMLDivElement>()
  const letters = useLetters()
  const stage = useRef<HTMLDivElement | null>(null)
  // One ref for the stage's life: a new one each render would measure it again mid-animation
  // and leave the old size observer running.
  const stageRef = useCallback(
    (el: HTMLDivElement | null) => {
      stage.current = el
      return measure(el)
    },
    [measure]
  )
  const [first, setFirst] = useState<string | null>(null)
  // Linking switched off from outside drops the half-made link too.
  const [wasLinking, setWasLinking] = useState(linking)
  if (wasLinking !== linking) {
    setWasLinking(linking)
    if (!linking) setFirst(null)
  }
  const [drag, setDrag] = useState<Drag | null>(null)
  const [drop, setDrop] = useState<string | null>(null)
  // A drag ends in a click on the node it started on, which must not open its settings.
  const dragged = useRef(false)
  const arrow = useId()
  // Marked once something is linked; before that every node is simply waiting.
  const stray = new Set(pattern.edges.length ? loose(pattern).map((n) => n.key) : [])

  const width = size?.width ?? 0
  const height = size?.height ?? 0
  const at = (x: number, y: number): Point => ({
    x: Math.min(Math.max(x * width, NODE_W / 2 + 12), width - NODE_W / 2 - 12),
    y: Math.min(Math.max(y * height, NODE_H / 2 + 16), height - NODE_H / 2 - 36),
  })
  const spot = (key: string) => {
    const n = pattern.nodes.find((x) => x.key === key)!
    return at(n.x, n.y)
  }
  const local = (e: { clientX: number; clientY: number }): Point => {
    const box = stage.current!.getBoundingClientRect()
    return { x: e.clientX - box.left, y: e.clientY - box.top }
  }

  const stopLinking = () => {
    onLinking(false)
    setFirst(null)
  }
  const link = (a: string, b: string) => {
    const next = connect(pattern, a, b)
    const made = next.edges.find((e) => !pattern.edges.some((x) => x.key === e.key))
    // A new link opens its settings, as the relationship is what it is drawn for.
    onChange(next, made?.key ?? null)
  }

  // Escape stops linking or a drag before the modal sees it, so the modal stays open.
  const busy = linking || drag !== null
  const onEscape = useEffectEvent((e: KeyboardEvent) => {
    if (e.key !== 'Escape') return
    e.stopPropagation()
    e.preventDefault()
    stopLinking()
    setDrag(null)
  })
  useEffect(() => {
    if (!busy) return
    window.addEventListener('keydown', onEscape, { capture: true })
    return () => window.removeEventListener('keydown', onEscape, { capture: true })
  }, [busy])

  const onMove = useEffectEvent((e: globalThis.PointerEvent) => {
    if (!drag) return
    const p = local(e)
    const moved = drag.moved || Math.hypot(p.x - drag.start.x, p.y - drag.start.y) > DRAG_PX
    setDrag({ ...drag, at: p, moved })
    if (drag.mode === 'move' && moved)
      onChange(moveNode(pattern, drag.key, p.x / width, p.y / height))
  })
  const onUp = useEffectEvent((e: globalThis.PointerEvent) => {
    if (!drag) return
    dragged.current = drag.moved
    if (drag.mode === 'link') {
      const target = (
        document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null
      )?.closest<HTMLElement>('[data-node]')?.dataset.node
      if (target && target !== drag.key) link(drag.key, target)
    }
    setDrag(null)
    setDrop(null)
  })
  const dragging = drag !== null
  useEffect(() => {
    if (!dragging) return
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [dragging])

  const start = (mode: Drag['mode'], key: string) => (e: PointerEvent) => {
    if (e.button !== 0 || (linking && mode === 'move')) return
    e.stopPropagation()
    const p = local(e)
    setDrag({ mode, key, start: p, at: p, moved: false })
  }
  const clickNode = (key: string, on: boolean) => (e: MouseEvent) => {
    if (dragged.current) {
      dragged.current = false
      e.preventDefault()
      return
    }
    if (linking) {
      e.preventDefault()
      if (!first) return setFirst(key)
      link(first, key)
      return stopLinking()
    }
    onSelect(on ? null : key)
  }

  return (
    <div
      ref={stageRef}
      className={cn(
        'relative h-full min-h-48 w-full touch-none overflow-hidden bg-surface-sunken select-none',
        (linking || drag?.mode === 'link') && 'cursor-crosshair'
      )}
      style={PAPER}
      onClick={(e) => e.target === e.currentTarget && onSelect(null)}
    >
      <AnimatePresence>
        {linking && (
          <motion.p {...fade} className="pointer-events-none absolute top-3 left-4 text-sm text-fg">
            {first ? 'Kliknij drugi węzeł.' : 'Kliknij pierwszy węzeł do połączenia.'}
          </motion.p>
        )}
      </AnimatePresence>

      {size && (
        <>
          <svg
            className="pointer-events-none absolute inset-0"
            width={width}
            height={height}
            aria-hidden
          >
            <defs>
              {/* A slim head with a notched back, one per line colour so it matches its line. */}
              {Object.entries(HEADS).map(([name, color]) => (
                <marker
                  key={name}
                  id={`${arrow}-${name}`}
                  viewBox="0 0 12 10"
                  refX="3"
                  refY="5"
                  markerWidth="12"
                  markerHeight="10"
                  markerUnits="userSpaceOnUse"
                  orient="auto-start-reverse"
                >
                  <path d="M0 0.5L12 5L0 9.5L3 5Z" style={{ fill: color }} />
                </marker>
              ))}
            </defs>
            <AnimatePresence initial={false}>
              {pattern.edges.map((edge) => {
                const a = spot(edge.source)
                const b = spot(edge.target)
                const on = selected === edge.key
                const relating = edge.via === 'relation'
                const headAt = (end: Direction) => relating && edge.direction === end
                // The line stops where the head's notch is; the head reaches on to its tip.
                const from = boxEdge(a, b, NODE_W, GAP + (headAt('in') ? HEAD_BODY : 0))
                const to = boxEdge(b, a, NODE_W, GAP + (headAt('out') ? HEAD_BODY : 0))
                const head = `url(#${arrow}-${edge.mode === 'not' ? 'not' : on ? 'on' : 'off'})`
                return (
                  <motion.line
                    key={edge.key}
                    {...fade}
                    x1={from.x}
                    y1={from.y}
                    x2={to.x}
                    y2={to.y}
                    strokeDasharray={linkDash(edge)}
                    strokeLinecap={edge.via === 'articles' ? 'round' : undefined}
                    markerEnd={headAt('out') ? head : undefined}
                    markerStart={headAt('in') ? head : undefined}
                    style={{ stroke: linkColor(edge, on), strokeWidth: on ? 2.5 : 1.5 }}
                  />
                )
              })}
            </AnimatePresence>
            {drag?.mode === 'link' && (
              <line
                x1={spot(drag.key).x}
                y1={spot(drag.key).y}
                x2={drag.at.x}
                y2={drag.at.y}
                strokeDasharray="4 4"
                style={{ stroke: 'var(--fg)', strokeWidth: 1.5 }}
              />
            )}
          </svg>

          <AnimatePresence initial={false}>
            {pattern.edges.map((edge) => {
              const a = spot(edge.source)
              const b = spot(edge.target)
              const on = selected === edge.key
              const text = linkText(edge)
              const not = edge.mode === 'not'
              return (
                <motion.button
                  key={edge.key}
                  {...pop}
                  type="button"
                  onClick={() => onSelect(on ? null : edge.key)}
                  title={text}
                  className={cn(
                    'absolute max-w-44 -translate-x-1/2 -translate-y-1/2 truncate border px-2 py-0.5 text-xs font-medium transition-colors',
                    on
                      ? not
                        ? 'border-danger bg-danger text-fg-inverse'
                        : 'border-fg bg-fg text-fg-inverse'
                      : not
                        ? 'border-danger bg-surface text-danger hover:border-danger'
                        : 'border-line bg-surface text-fg-soft hover:border-fg hover:text-fg',
                    edge.mode === 'optional' && !on && 'border-dashed',
                    focusRing
                  )}
                  style={{ left: (a.x + b.x) / 2, top: (a.y + b.y) / 2 }}
                >
                  {text}
                </motion.button>
              )
            })}
          </AnimatePresence>

          {/* Nodes and links come and go as they are added and removed, never while dragged. */}
          <AnimatePresence initial={false}>
            {pattern.nodes.map((node) => {
              const p = spot(node.key)
              const label = labelOf(node)
              const ink = label ? inkFor(label) : null
              const known = node.known !== null
              const on = selected === node.key
              const count = known ? undefined : counts?.[node.key]
              const target = drag?.mode === 'link' && drop === node.key && drop !== drag.key
              const marked = on || first === node.key
              const letter = letters.get(node.key)
              // A hovered match puts its entity where the drawing named only the type.
              const shown = lit?.get(node.key)
              return (
                <motion.div
                  key={node.key}
                  {...pop}
                  className="group absolute"
                  style={{
                    left: p.x - NODE_W / 2,
                    top: p.y - NODE_H / 2,
                    width: NODE_W,
                    height: NODE_H,
                  }}
                >
                  {/* A group shows as a stack: a sheet behind for each more entity, up to two. */}
                  {Array.from(
                    { length: Math.min((node.known?.length ?? 1) - 1, STACK) },
                    (_, i) => (
                      <span
                        key={i}
                        aria-hidden
                        className="absolute inset-0 border"
                        style={{
                          translate: `${(STACK - i) * SHEET}px ${-(STACK - i) * SHEET}px`,
                          borderColor: ink ? ink.color : 'var(--fg-subtle)',
                          background: ink ? ink.field : 'var(--surface-sunken)',
                        }}
                      />
                    )
                  )}
                  <button
                    type="button"
                    data-node={node.key}
                    onPointerDown={start('move', node.key)}
                    onPointerEnter={() => drag?.mode === 'link' && setDrop(node.key)}
                    onPointerLeave={() => setDrop(null)}
                    onClick={clickNode(node.key, on)}
                    aria-label={[nodeTitle(node), caption(node)].filter(Boolean).join(', ')}
                    className={cn(
                      'relative flex size-full border text-center transition-[border-color,box-shadow]',
                      linking ? 'cursor-crosshair' : 'cursor-grab active:cursor-grabbing',
                      known ? 'border-solid' : 'border-dashed bg-surface',
                      marked && 'border-solid shadow-[4px_4px_0_var(--fg)]',
                      (target || lit?.has(node.key)) &&
                        'ring-2 ring-fg ring-offset-2 ring-offset-surface-sunken',
                      focusRing
                    )}
                    style={{
                      borderColor: marked
                        ? 'var(--fg)'
                        : stray.has(node.key)
                          ? 'var(--danger)'
                          : known && ink
                            ? ink.color
                            : 'var(--fg-subtle)',
                      background: known ? (ink ? ink.field : 'var(--surface-sunken)') : undefined,
                    }}
                  >
                    {!known && (
                      // The mark of a sought entity, set off by the same dashed line as its border.
                      <span className="flex w-10 shrink-0 items-center justify-center border-r border-dashed border-fg-subtle bg-surface-sunken text-fg-muted">
                        {letter ? (
                          <Letter letter={letter} className="text-base text-fg" />
                        ) : (
                          <ScanSearchIcon className="size-[18px]" aria-hidden />
                        )}
                      </span>
                    )}
                    <span className="flex min-w-0 flex-1 flex-col items-center justify-center px-3">
                      <span
                        className="flex w-full justify-center gap-1 text-sm font-semibold"
                        style={{ color: known && ink ? ink.color : 'var(--fg)' }}
                      >
                        {node.known && node.known.length > 1 ? (
                          // The name gives way to the count, which always shows.
                          <>
                            <span className="truncate">{node.known[0].name}</span>
                            <span className="shrink-0">+{node.known.length - 1}</span>
                          </>
                        ) : (
                          <span className="truncate">{shown ?? nodeTitle(node)}</span>
                        )}
                      </span>
                      {shown ? (
                        <span className="w-full truncate text-[10px] font-medium tracking-wider text-fg-subtle uppercase">
                          {nodeTitle(node)}
                        </span>
                      ) : (
                        (stray.has(node.key) || caption(node)) && (
                          <span
                            className={cn(
                              'w-full truncate text-xs',
                              stray.has(node.key) ? 'text-danger' : 'text-fg-subtle',
                              // Plain "szukana encja", not the conditions, set as a small label.
                              !known &&
                                !stray.has(node.key) &&
                                caption(node) === SOUGHT &&
                                'text-[10px] font-medium tracking-wider uppercase'
                            )}
                          >
                            {stray.has(node.key) ? 'niepołączony' : caption(node)}
                          </span>
                        )
                      )}
                    </span>
                  </button>

                  {count !== undefined && (
                    <span
                      className="pointer-events-none absolute -top-2.5 -right-2.5 min-w-6 border border-fg bg-fg px-1.5 text-center text-xs leading-5 font-semibold text-fg-inverse tabular-nums"
                      title={`${count} ${pluralForm(count, MATCH_FORMS)}`}
                    >
                      {count}
                    </span>
                  )}

                  <span
                    role="presentation"
                    title="Przeciągnij do innego węzła, żeby je połączyć"
                    onPointerDown={start('link', node.key)}
                    className={cn(
                      'absolute top-1/2 -right-2 size-4 -translate-y-1/2 cursor-crosshair rounded-full border-2 border-fg bg-surface transition-opacity hover:bg-fg',
                      drag?.mode === 'link' && drag.key === node.key
                        ? 'bg-fg opacity-100'
                        : 'opacity-0 group-hover:opacity-100'
                    )}
                  />
                </motion.div>
              )
            })}
          </AnimatePresence>
        </>
      )}
    </div>
  )
}
