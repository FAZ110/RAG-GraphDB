import { CopyIcon, PlusIcon, Wand2Icon, XIcon } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate } from 'react-router-dom'
import { Button, EmptyState, ErrorNote, IconButton } from '@/components/deck'
import { CHROME_INSET } from '@/components/Analysis/layout'
import { Dock } from '@/components/Analysis/dock/Dock'
import { DockSearch } from '@/components/Analysis/dock/DockSearch'
import { ToolButton } from '@/components/Analysis/dock/ToolButton'
import { SearchBrowser } from '@/components/Analysis/dock/SearchBrowser'
import { useDockSearch } from '@/components/Analysis/dock/useDockSearch'
import type { SearchHit } from '@/components/Analysis/dock/searchResults'
import { LayersPanel } from '@/components/Analysis/panels/LayersPanel'
import { useEditorKeys } from '@/components/Analysis/useEditorKeys'
import type { Insets } from '@/components/canvas/types'
import { DuplicatesModal } from './DuplicatesModal'
import { NodeCreateModal } from './EditForms'
import { useDuplicates } from './useDuplicates'
import { ArticlePreview } from '@/components/Spaces/preview/ArticlePreview'
import { ENTITY_FORMS, pluralForm } from '@/components/Spaces/spaceText'
import { WindowLayer } from '@/components/workspace/WindowLayer'
import { inkFor, inkTint } from '@/design/inks'
import { staggerDelay } from '@/design/motion'
import { cn } from '@/lib/utils'
import { fetchArticle } from '@/services/api'
import type { Space } from '@/types'
import type { LabelCount, RelationGroup } from '@/types/analysis'
import { EdgeInspector } from './EdgeInspector'
import { GraphMap } from './GraphMap'
import { MapBar } from './MapBar'
import { MapInspector } from './MapInspector'
import { MapPickBar } from './MapPickBar'
import { StatsPanel } from './stats/StatsPanel'
import type { ColorBy, MapHandle, PickKind } from './types'
import { useGraphOverview } from './useGraphOverview'
import { useMapEdits } from './useMapEdits'

const NONE: ReadonlySet<string> = new Set()

const without = (set: ReadonlySet<string>, item: string | undefined) => {
  if (!item || !set.has(item)) return set
  const next = new Set(set)
  next.delete(item)
  return next
}

interface Props {
  space: Space
  spaces: Space[]
  focus: string | null
}

export function SpaceMap({ space, spaces, focus }: Props) {
  const navigate = useNavigate()
  const overview = useGraphOverview(space.id)
  const data = overview.data
  const map = useRef<MapHandle>(null)
  const search = useRef<HTMLInputElement>(null)
  const frame = useRef<HTMLDivElement>(null)
  const top = useRef<HTMLDivElement>(null)
  const left = useRef<HTMLDivElement>(null)
  const right = useRef<HTMLDivElement>(null)
  const bottom = useRef<HTMLDivElement>(null)
  const pendingFocus = useRef(focus)
  const laidOut = useRef(false)
  const fitted = useRef(false)
  const [colorBy, setColorBy] = useState<ColorBy>('type')
  const [hidden, setHidden] = useState<ReadonlySet<string>>(NONE)
  const [highlighted, setHighlighted] = useState<ReadonlySet<string>>(NONE)
  const [selectedId, setSelectedId] = useState<string | null>(focus)
  const [layingOut, setLayingOut] = useState(false)
  const [article, setArticle] = useState<{ id: string; focusId: string | null } | null>(null)
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null)
  const [pick, setPick] = useState<{ kind: PickKind; from: string; to: string | null } | null>(null)
  const [creating, setCreating] = useState(false)
  const [statsOpen, setStatsOpen] = useState(false)
  const edits = useMapEdits(space.id)
  const duplicates = useDuplicates(space.id)

  const kindOf = useMemo(() => new Map(data?.nodes.map((n) => [n.id, n.label])), [data])
  const nameOf = useMemo(() => new Map(data?.nodes.map((n) => [n.id, n.name || n.id])), [data])
  const named = (id: string) => ({ id, name: nameOf.get(id) ?? id })
  const kinds: LabelCount[] = useMemo(() => {
    const counts = new Map<string, number>()
    for (const label of kindOf.values()) counts.set(label, (counts.get(label) ?? 0) + 1)
    return [...counts]
      .map(([label, count]) => ({ label, count }))
      .toSorted((a, b) => b.count - a.count)
  }, [kindOf])

  const insets = (): Insets => {
    const box = frame.current!.getBoundingClientRect()
    const rect = (el: HTMLElement | null) => el?.getBoundingClientRect()
    const bar = rect(top.current) ?? box
    const shown = (el: HTMLElement | null) => (rect(el)?.width ? rect(el)! : null)
    const dock = rect(bottom.current)
    const dockOnTop = dock && dock.top < (box.top + box.bottom) / 2
    return {
      top: (dockOnTop ? dock.bottom : bar.bottom) - box.top,
      right: box.right - (shown(right.current)?.left ?? bar.right),
      bottom: dock && !dockOnTop ? box.bottom - dock.top : 0,
      left: (shown(left.current)?.right ?? bar.left) - box.left,
    }
  }

  const select = (id: string | null) => {
    setSelectedId(id)
    setSelectedEdgeId(null)
    if (id) setHidden((h) => without(h, kindOf.get(id)))
  }
  const focusSoon = (id: string) =>
    requestAnimationFrame(() => requestAnimationFrame(() => map.current?.focus(id)))
  const show = (id: string) => {
    select(id)
    setHighlighted(NONE)
    focusSoon(id)
  }
  const clear = () => {
    setSelectedId(null)
    setSelectedEdgeId(null)
    setHighlighted(NONE)
  }
  const startPick = (kind: PickKind, from: string) => {
    edits.merge.reset()
    edits.addEdge.reset()
    setHighlighted(NONE)
    setPick({ kind, from, to: null })
  }
  const endPick = (selectId?: string) => {
    setPick(null)
    setHighlighted(NONE)
    if (selectId) select(selectId)
  }
  const pickOn = (id: string | null) => {
    if (!pick || pick.to || !id || id === pick.from) return
    setPick({ ...pick, to: id })
    setHighlighted(new Set([pick.from, id]))
  }

  const [lastFocus, setLastFocus] = useState(focus)
  if (focus !== lastFocus) {
    setLastFocus(focus)
    if (focus) setSelectedId(focus)
  }
  useEffect(() => {
    if (!focus) return
    if (laidOut.current) focusSoon(focus)
    else pendingFocus.current = focus
  }, [focus])

  const onLayout = (running: boolean, interrupted = false) => {
    setLayingOut(running)
    laidOut.current = !running
    if (running) return
    if (interrupted) {
      fitted.current = true
      pendingFocus.current = null
      return
    }
    if (pendingFocus.current) focusSoon(pendingFocus.current)
    else if (!fitted.current) map.current?.fit()
    pendingFocus.current = null
    fitted.current = true
  }

  const tidy = () => {
    if ((data?.nodes.length ?? 0) < 2) return
    fitted.current = false
    map.current?.tidy()
  }

  const showGroup = (nodeId: string, group: RelationGroup) => {
    const ids = new Set([nodeId])
    for (const e of data?.edges ?? []) {
      if (e.type !== group.type) continue
      const other =
        group.direction === 'out'
          ? e.source === nodeId
            ? e.target
            : null
          : e.target === nodeId
            ? e.source
            : null
      if (other && kindOf.get(other) === group.label) ids.add(other)
    }
    setHighlighted(ids)
  }

  const browse = useDockSearch(
    space.id,
    () => false,
    () => 0,
    (hit: SearchHit) => {
      if (hit.kind === 'entity') return show(hit.id)
      if (hit.kind === 'type') {
        setSelectedId(null)
        setHidden((h) => without(h, hit.id))
        return setHighlighted(
          new Set(data?.nodes.filter((n) => n.label === hit.id).map((n) => n.id))
        )
      }
      void fetchArticle(space.id, hit.id).then((a) => {
        const ids = a.entities.map((e) => e.id).filter((id) => kindOf.has(id))
        setSelectedId(null)
        setHighlighted(new Set(ids))
        if (ids[0]) focusSoon(ids[0])
      })
    }
  )

  useEditorKeys((key) => {
    if (key === 'search') return search.current?.focus()
    if (key === 'fit') return map.current?.fit()
    if (key === 'tidy') return tidy()
    if (key === 'escape') {
      if (pick) return endPick()
      if (!selectedId && !selectedEdgeId && !highlighted.size) return false
      return clear()
    }
    return false
  })

  const bar = pick
    ? {
        key: 'pick',
        content: (
          <MapPickBar
            kind={pick.kind}
            from={named(pick.from)}
            to={pick.to ? named(pick.to) : null}
            edits={edits}
            onSwap={() => pick.to && setPick({ ...pick, from: pick.to, to: pick.from })}
            onDone={endPick}
            onCancel={() => endPick()}
          />
        ),
      }
    : browse.open
      ? {
          key: 'search',
          content: <SearchBrowser search={browse} addedToggle={false} pickLabel="pokaż" />,
        }
      : highlighted.size
        ? {
            key: 'highlight',
            content: (
              <div className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                <span className="text-fg-muted">
                  Wyróżniono {highlighted.size} {pluralForm(highlighted.size, ENTITY_FORMS)}
                </span>
                <Button size="sm" variant="ghost" onClick={() => setHighlighted(NONE)}>
                  <XIcon />
                  Wyczyść
                </Button>
              </div>
            ),
          }
        : null

  const empty = data && data.nodes.length === 0
  const selectedEdge = data?.edges.find((e) => e.id === selectedEdgeId) ?? null

  return createPortal(
    <div
      ref={frame}
      style={{ ['--paper-dot' as string]: inkTint(inkFor(space.id), 14) }}
      className="fixed inset-x-0 top-15 bottom-0 z-0 overflow-hidden bg-page sm:top-0"
    >
      {data && !empty && (
        <div className="absolute inset-0">
          <GraphMap
            ref={map}
            data={data}
            colorBy={colorBy}
            hiddenKinds={hidden}
            highlighted={highlighted}
            selectedId={selectedId}
            selectedEdgeId={selectedEdgeId}
            onSelect={(id) => {
              if (pick) return pickOn(id)
              select(id)
              if (!id) setHighlighted(NONE)
            }}
            onSelectEdge={(id) => {
              if (pick) return
              setSelectedId(null)
              setSelectedEdgeId(id)
            }}
            onLayout={onLayout}
            insets={insets}
          />
        </div>
      )}

      <div className={cn('pointer-events-none absolute inset-0 flex flex-col gap-3', CHROME_INSET)}>
        <div ref={top} style={{ animationDelay: `${staggerDelay(0)}s` }} className="deck-land">
          <MapBar
            spaces={spaces}
            spaceId={space.id}
            onSpace={(id) => navigate(`/graph/${id}`)}
            nodes={data?.nodes.length ?? 0}
            edges={data?.edges.length ?? 0}
            total={data?.total_nodes ?? 0}
            layingOut={layingOut}
            colorBy={colorBy}
            onColorBy={setColorBy}
            statsOpen={statsOpen}
            onStats={() => setStatsOpen((open) => !open)}
            onZoom={(f) => map.current?.zoomBy(f)}
            onFit={() => map.current?.fit()}
          />
        </div>

        {overview.error && (
          <ErrorNote className="pointer-events-auto self-start">{overview.error.message}</ErrorNote>
        )}
        {overview.isPending && (
          <p className="self-center pt-24 text-sm text-fg-subtle">Wczytuję graf przestrzeni…</p>
        )}
        {empty && (
          <EmptyState
            title="Ta przestrzeń nie ma jeszcze grafu"
            className="pointer-events-auto mx-auto mt-16 max-w-md bg-surface"
            action={
              <Button asChild variant="primary" size="sm">
                <Link to={`/spaces/${space.id}`}>Dodaj artykuły</Link>
              </Button>
            }
          >
            Graf powstaje z encji i powiązań wyekstrahowanych z artykułów przestrzeni.
          </EmptyState>
        )}

        <WindowLayer
          leftRef={left}
          rightRef={right}
          style={{ animationDelay: `${staggerDelay(2)}s` }}
          className="deck-land hidden min-h-0 flex-1 md:block"
          windows={[
            {
              id: 'map-legend',
              side: 'left',
              width: 224,
              content:
                kinds.length > 0 ? (
                  <LayersPanel
                    types={kinds}
                    total={data?.nodes.length ?? 0}
                    hidden={hidden}
                    onToggle={(label) => {
                      const next = new Set(hidden)
                      if (!next.delete(label)) next.add(label)
                      setHidden(next)
                    }}
                    onSelectType={(label) => {
                      setSelectedId(null)
                      setHighlighted(
                        new Set(data?.nodes.filter((n) => n.label === label).map((n) => n.id))
                      )
                    }}
                  />
                ) : null,
            },
            {
              id: 'map-stats',
              side: 'left',
              width: 260,
              content:
                statsOpen && data && data.nodes.length > 0 ? (
                  <StatsPanel data={data} onShow={show} onClose={() => setStatsOpen(false)} />
                ) : null,
            },
            {
              id: 'map-inspector',
              side: 'right',
              width: 320,
              content: selectedEdge ? (
                <EdgeInspector
                  key={selectedEdge.id}
                  spaceId={space.id}
                  edge={{
                    id: selectedEdge.id,
                    type: selectedEdge.type,
                    source: named(selectedEdge.source).name,
                    target: named(selectedEdge.target).name,
                  }}
                  edits={edits}
                  onReplaced={setSelectedEdgeId}
                  onOpenArticle={(id) => setArticle({ id, focusId: selectedEdge.id })}
                  onClose={() => setSelectedEdgeId(null)}
                />
              ) : (
                selectedId &&
                kindOf.has(selectedId) && (
                  <MapInspector
                    key={selectedId}
                    spaceId={space.id}
                    nodeId={selectedId}
                    edits={edits}
                    onShowGroup={(g) => showGroup(selectedId, g)}
                    onOpenArticle={(id) => setArticle({ id, focusId: selectedId })}
                    onStartPick={(kind) => startPick(kind, selectedId)}
                    onClose={() => setSelectedId(null)}
                  />
                )
              ),
            },
          ]}
        />

        <div
          ref={bottom}
          style={{ animationDelay: `${staggerDelay(1)}s` }}
          className={cn('deck-land relative z-10 flex justify-center', !data && 'hidden')}
        >
          <Dock bar={bar}>
            <DockSearch search={browse} inputRef={search} />
            <span className="mx-1 h-6 w-px bg-line" />
            <IconButton
              variant="ghost"
              size="icon-sm"
              label="Nowa encja"
              onClick={() => {
                edits.addNode.reset()
                setCreating(true)
              }}
            >
              <PlusIcon />
            </IconButton>
            <ToolButton
              label="Uporządkuj wszystko"
              hotkey="L"
              unavailable={(data?.nodes.length ?? 0) > 1 ? undefined : 'Najpierw dodaj encje'}
              onClick={tidy}
            >
              <Wand2Icon />
            </ToolButton>
            {duplicates.suggestions.length > 0 && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  edits.merge.reset()
                  duplicates.setOpen(true)
                }}
              >
                <CopyIcon />
                Duplikaty
                <span className="tabular-nums">{duplicates.suggestions.length}</span>
              </Button>
            )}
            {(selectedId || selectedEdgeId || highlighted.size > 0) && (
              <IconButton
                variant="ghost"
                size="icon-sm"
                label="Wyczyść zaznaczenie (Esc)"
                onClick={clear}
              >
                <XIcon />
              </IconButton>
            )}
          </Dock>
        </div>
      </div>

      <NodeCreateModal
        open={creating}
        onOpenChange={setCreating}
        spaceId={space.id}
        pending={edits.addNode.isPending}
        error={edits.addNode.error?.message ?? null}
        onSubmit={(fields) =>
          edits.addNode.mutate(fields, {
            onSuccess: (node) => {
              setCreating(false)
              show(node.id)
            },
          })
        }
        onShowExisting={(id) => {
          setCreating(false)
          show(id)
        }}
      />
      <DuplicatesModal
        open={duplicates.open}
        onOpenChange={duplicates.setOpen}
        spaceId={space.id}
        suggestions={duplicates.suggestions}
        edits={edits}
        onShow={(id) => {
          duplicates.setOpen(false)
          show(id)
        }}
      />
      <ArticlePreview
        spaceId={space.id}
        articleId={article?.id ?? null}
        focusId={article?.focusId}
        open={article !== null}
        onOpenChange={(open) => !open && setArticle(null)}
      />
    </div>,
    document.body
  )
}
