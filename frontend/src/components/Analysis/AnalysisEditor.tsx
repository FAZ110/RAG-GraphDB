import { AnimatePresence, motion } from 'motion/react'
import { BlendIcon, CircleDotDashedIcon, RouteIcon } from 'lucide-react'
import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { GraphCanvas } from '@/components/canvas/GraphCanvas'
import type { CanvasHandle, Insets } from '@/components/canvas/types'
import { ArticlePreview } from '@/components/Spaces/preview/ArticlePreview'
import { inkFor, inkTint } from '@/design/inks'
import { slideFromEnd, staggerDelay } from '@/design/motion'
import { cn } from '@/lib/utils'
import type { Space } from '@/types'
import type { Analysis, Point } from '@/types/analysis'
import { WindowLayer } from '@/components/workspace/WindowLayer'
import { EditorBar } from './bar/EditorBar'
import { Dock } from './dock/Dock'
import { DockSearch } from './dock/DockSearch'
import { SearchBrowser } from './dock/SearchBrowser'
import { TidyButton } from './dock/TidyButton'
import { useDockSearch } from './dock/useDockSearch'
import { useCanvasSources } from './state/useCanvasSources'
import { PickBar } from './dock/PickBar'
import { ProposalBar } from './dock/ProposalBar'
import { ToolButton } from './dock/ToolButton'
import { TypePicker } from './dock/TypePicker'
import { EmptyCanvas } from './EmptyCanvas'
import { EntityInspector } from './panels/EntityInspector'
import { LayersPanel } from './panels/LayersPanel'
import { SelectionInspector } from './panels/SelectionInspector'
import { SourcesPanel } from './panels/SourcesPanel'
import { CHROME_INSET } from './layout'
import { relationGroupKey } from './proposal/proposal'
import { useAnalysisEditor } from './useAnalysisEditor'
import { useEditorKeys } from './useEditorKeys'
import { useToolPicking } from './useToolPicking'

interface Props {
  space: Space
  initial: Analysis | null
  onCreated: (analysis: Analysis) => void
  onReload: () => void
}

export function AnalysisEditor({ space, initial, onCreated, onReload }: Props) {
  const canvas = useRef<CanvasHandle>(null)
  const editor = useAnalysisEditor(space.id, initial, canvas, onCreated)
  const search = useRef<HTMLInputElement>(null)
  const frame = useRef<HTMLDivElement>(null)
  const top = useRef<HTMLDivElement>(null)
  const left = useRef<HTMLDivElement>(null)
  const right = useRef<HTMLDivElement>(null)
  const bottom = useRef<HTMLDivElement>(null)
  const [typesOpen, setTypesOpen] = useState(false)
  // The article open in the side sheet, and the entity whose passages it marks and scrolls to.
  const [article, setArticle] = useState<{ id: string; focusId: string | null } | null>(null)
  const [blank, setBlank] = useState(false)
  const { proposal, selected, selectedPlaced } = editor
  const canvasSources = useCanvasSources(space.id, [...editor.doc.entities.keys()])
  const placedIn = new Map(canvasSources.data?.map((a) => [a.id, a.entity_ids.length]))
  const browse = useDockSearch(
    space.id,
    (id) => editor.doc.entities.has(id),
    (articleId) => placedIn.get(articleId) ?? 0,
    (hit) => {
      if (hit.kind === 'entity') void editor.place(hit.id)
      else if (hit.kind === 'article') void proposal.fromArticle(hit.id)
      else void proposal.ofType(hit.id)
    }
  )
  const one = selectedPlaced.length === 1 ? selectedPlaced[0] : null
  const empty = editor.doc.entities.size === 0 && !proposal.view && !proposal.looking && !blank

  // The parts of the canvas the bar, panels and dock cover, measured when the camera moves.
  const insets = (): Insets => {
    const box = frame.current!.getBoundingClientRect()
    const rect = (el: HTMLElement | null) => el?.getBoundingClientRect()
    // Where the chrome begins: the bar runs from the rail's edge to the window's.
    const bar = rect(top.current) ?? box
    const shown = (el: HTMLElement | null) => (rect(el)?.width ? rect(el)! : null)
    // On narrow screens the dock sits under the bar instead of at the bottom.
    const dock = rect(bottom.current)
    const dockOnTop = dock && dock.top < (box.top + box.bottom) / 2
    return {
      top: (dockOnTop ? dock.bottom : bar.bottom) - box.top,
      right: box.right - (shown(right.current)?.left ?? bar.right),
      bottom: dock && !dockOnTop ? box.bottom - dock.top : 0,
      left: (shown(left.current)?.right ?? bar.left) - box.left,
    }
  }

  // New ghosts are laid out among the canvas as they would settle once taken, then shown.
  const ghostKey = editor.ghosts.map((g) => g.id).join(',')
  const onPlanned = useEffectEvent((ids: string[], spots: Map<string, Point>) => {
    proposal.respot(spots)
    canvas.current?.reveal(ids)
  })
  useEffect(() => {
    if (!ghostKey) return
    const ids = ghostKey.split(',')
    let current = true
    void canvas.current?.plan(ids).then((spots) => current && onPlanned(ids, spots))
    return () => {
      current = false
    }
  }, [ghostKey])

  const picks = useToolPicking((tool, ids) => {
    const placed = ids.flatMap((id) => editor.doc.entities.get(id) ?? [])
    editor.select(ids)
    if (tool === 'expand') editor.expand(placed[0])
    if (tool === 'common') void proposal.common(placed)
    if (tool === 'path') void proposal.path(placed[0], placed[1])
  })
  const tools = {
    expand: () => picks.start('expand', selected),
    common: () => picks.start('common', selected),
    path: () => picks.start('path', selected),
  }
  // While a tool waits for entities, a click on one picks it instead of selecting it alone.
  const onSelect = (ids: string[]) => {
    if (!picks.picking) return editor.select(ids)
    const current = picks.picking.ids
    const tapped = ids.find((id) => !current.includes(id)) ?? (ids.length === 1 ? ids[0] : null)
    if (tapped) picks.toggle(tapped)
  }

  useEditorKeys((key) => {
    switch (key) {
      case 'search':
        return search.current?.focus()
      case 'expand':
        return tools.expand()
      case 'common':
        return tools.common()
      case 'path':
        return tools.path()
      case 'type':
        return setTypesOpen(true)
      case 'fit':
        return canvas.current?.fit()
      case 'tidy':
        return void editor.tidy()
      case 'accept':
        if (picks.picking) return picks.go()
        if (!proposal.view) return false
        return editor.acceptAll()
      case 'escape':
        if (picks.picking) return picks.cancel()
        if (proposal.view || proposal.looking || proposal.error) return proposal.dismiss()
        return editor.select([])
      case 'remove':
        return editor.remove(selected)
      case 'undo':
        return editor.undo()
      case 'redo':
        return editor.redo()
      case 'selectAll':
        return editor.selectAll()
    }
  })

  const inspector = one ? (
    <EntityInspector
      key={`one:${one.node.id}`}
      spaceId={space.id}
      node={one.node}
      onExpand={(g) =>
        editor.expand(one, g && relationGroupKey(g.direction === 'in', g.type, g.label))
      }
      onRemove={() => editor.remove([one.node.id])}
      onOpenArticle={(id) => setArticle({ id, focusId: one.node.id })}
    />
  ) : selectedPlaced.length > 1 ? (
    <SelectionInspector
      key="many"
      nodes={selectedPlaced.map((p) => p.node)}
      onCommon={tools.common}
      onPath={tools.path}
      onRemove={() => editor.remove(selected)}
      onDeselect={(id) => editor.select(selected.filter((s) => s !== id))}
    />
  ) : editor.doc.entities.size > 0 ? (
    <SourcesPanel
      key="sources"
      spaceId={space.id}
      entityIds={[...editor.doc.entities.keys()]}
      labelOf={(id) => editor.doc.entities.get(id)?.node.label}
      onHover={editor.setLitArticle}
      onOpen={(id) => setArticle({ id, focusId: null })}
      onAddEntities={(id) => proposal.fromArticle(id)}
    />
  ) : null

  // What the dock opens onto: picking for a tool first, then the search while it has focus,
  // then what the last lookup found.
  const content = picks.picking ? (
    <PickBar
      tool={picks.picking.tool}
      picked={picks.picking.ids.flatMap((id) => editor.doc.entities.get(id)?.node ?? [])}
      canRun={picks.canRun}
      onRun={picks.go}
      onCancel={picks.cancel}
    />
  ) : browse.open ? (
    <SearchBrowser search={browse} />
  ) : proposal.view || proposal.looking || proposal.error ? (
    <ProposalBar
      view={proposal.view}
      looking={proposal.looking}
      error={proposal.error}
      onGroup={proposal.setGroup}
      onHoverGroup={editor.setLitGroup}
      onMore={proposal.showMore}
      onAcceptAll={editor.acceptAll}
      onDismiss={proposal.dismiss}
    />
  ) : null
  const bar = content && {
    key: picks.picking ? 'pick' : browse.open ? 'search' : 'proposal',
    content,
  }

  // On the body, under the rail, so the map paper fills the window; the page's settling
  // transform would otherwise pin it inside the page. `top-15` is the phone navbar's height,
  // App's `--nav-block`, which doesn't reach outside the app root.
  return createPortal(
    <div
      ref={frame}
      style={{ ['--paper-dot' as string]: inkTint(inkFor(space.id), 14) }}
      className="fixed inset-x-0 top-15 bottom-0 z-0 overflow-hidden sm:top-0"
    >
      <GraphCanvas
        ref={canvas}
        nodes={editor.nodes}
        edges={editor.edges}
        selected={picks.picking ? picks.picking.ids : selected}
        highlight={editor.highlight}
        initialViewport={initial?.viewport}
        onSelect={onSelect}
        onGhostClick={editor.acceptGhost}
        onHover={editor.setHoverId}
        onMove={editor.move}
        onViewport={editor.saveViewport}
        insets={insets}
      />
      <AnimatePresence>
        {empty && (
          <EmptyCanvas
            spaceId={space.id}
            onEntity={(node) => editor.place(node.id, node)}
            onArticle={proposal.fromArticle}
            onBlank={() => {
              setBlank(true)
              search.current?.focus()
            }}
          />
        )}
      </AnimatePresence>

      <div className={cn('pointer-events-none absolute inset-0 flex flex-col gap-3', CHROME_INSET)}>
        {/* Dealt onto the paper one after another: bar, dock, then the panels. */}
        <div ref={top} style={{ animationDelay: `${staggerDelay(0)}s` }} className="deck-land">
          <EditorBar
            spaceName={space.name}
            name={editor.name}
            onRename={editor.rename}
            save={editor.save}
            onReload={onReload}
            canUndo={editor.canUndo}
            canRedo={editor.canRedo}
            onUndo={editor.undo}
            onRedo={editor.redo}
            onZoom={(f) => canvas.current?.zoomBy(f)}
            onFit={() => canvas.current?.fit()}
          />
        </div>
        <WindowLayer
          leftRef={left}
          rightRef={right}
          style={{ animationDelay: `${staggerDelay(2)}s` }}
          className="deck-land hidden min-h-0 flex-1 md:block"
          windows={[
            {
              id: 'layers',
              side: 'left',
              width: 224,
              content:
                editor.types.length > 0 ? (
                  <LayersPanel
                    types={editor.types}
                    total={editor.doc.entities.size}
                    hidden={editor.hidden}
                    onToggle={editor.toggleType}
                    onSelectType={editor.selectType}
                  />
                ) : null,
            },
            {
              id: 'inspector',
              side: 'right',
              width: 320,
              content: inspector && (
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.div
                    key={inspector.key}
                    {...slideFromEnd}
                    className="flex max-h-full min-h-0 w-full"
                  >
                    {inspector}
                  </motion.div>
                </AnimatePresence>
              ),
            },
          ]}
        />
        <div
          ref={bottom}
          style={{ animationDelay: `${staggerDelay(1)}s` }}
          className="deck-land relative z-10 flex justify-center"
        >
          <Dock bar={bar}>
            <DockSearch search={browse} inputRef={search} />
            <span className="mx-1 h-6 w-px bg-line" />
            <ToolButton
              label="Rozwiń powiązania"
              hotkey="E"
              active={picks.picking?.tool === 'expand'}
              onClick={tools.expand}
            >
              <CircleDotDashedIcon />
            </ToolButton>
            <ToolButton
              label="Co je łączy"
              hotkey="C"
              active={picks.picking?.tool === 'common'}
              onClick={tools.common}
            >
              <BlendIcon />
            </ToolButton>
            <ToolButton
              label="Najkrótsza ścieżka"
              hotkey="P"
              active={picks.picking?.tool === 'path'}
              onClick={tools.path}
            >
              <RouteIcon />
            </ToolButton>
            <TidyButton
              label={selectedPlaced.length > 1 ? 'Uporządkuj zaznaczone' : 'Uporządkuj wszystko'}
              unavailable={editor.doc.entities.size > 1 ? undefined : 'Najpierw dodaj encje'}
              onTidy={() => void editor.tidy()}
            />
            <TypePicker
              spaceId={space.id}
              open={typesOpen}
              onOpenChange={setTypesOpen}
              onPick={proposal.ofType}
            />
          </Dock>
        </div>
      </div>

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
