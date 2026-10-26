import { useEffect, useMemo, useRef, useState } from 'react';
import { GraphCanvas, lightTheme } from 'reagraph';
import type { GraphCanvasRef, InternalGraphEdge, InternalGraphNode } from 'reagraph';
import { useProgressiveGraph } from './hooks/useProgressiveGraph';
import { adjacency, isExpanded, visibleDegree } from './utils/graphExpansion';
import { toReagraphEdges, toReagraphNodes } from './utils/toReagraph';
import { buildLabelColorMap } from './utils/buildLabelColorMap';
import { DetailsPanel, EdgeDetailsPanel, PickPanel } from './components/DetailsPanel';
import type { PickKind, SelectedEdge, SelectedNode } from './components/DetailsPanel';
import { NodeCreateModal } from './components/EditForms';
import { DuplicatesModal } from './components/DuplicatesModal';
import { useDuplicates } from './hooks/useDuplicates';
import { useGraphEdits } from './hooks/useGraphEdits';
import { Legend } from './components/Legend';
import type { LoadedEdge, LoadedNode } from '../../types';

const MAX_CENTER_FRAMES = 60;

export interface GraphSnapshot {
  nodes: LoadedNode[];
  edges: LoadedEdge[];
  totalNodes: number;
  colorMap: Record<string, string>;
}

interface Props {
  spaceId: string;
  highlightedIds?: string[];
  focusedId?: string | null;
  onGraphChange?: (snapshot: GraphSnapshot) => void;
}

export function GraphVisualizer({ spaceId, highlightedIds = [], focusedId = null, onGraphChange }: Props) {
  const graphRef = useRef<GraphCanvasRef | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const focusRequestRef = useRef(0);
  const {
    nodes,
    edges,
    state,
    totalNodes,
    isLoading,
    pendingId,
    error,
    focusNode,
    prunePins,
    toggleNode,
    applyEdit,
  } = useProgressiveGraph(spaceId);
  const edits = useGraphEdits(spaceId, applyEdit);
  const duplicates = useDuplicates(spaceId);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  // Merging or linking: the node it started from, then the one clicked on the canvas.
  const [pick, setPick] = useState<{ kind: PickKind; from: string; to: string | null } | null>(null);
  const [creating, setCreating] = useState(false);
  const pendingFocusRef = useRef<string | null>(null);
  const [focusTick, setFocusTick] = useState(0);

  const colorMap = useMemo(() => buildLabelColorMap(state.nodes.values()), [state.nodes]);

  const legendColorMap = useMemo(() => {
    const visibleLabels = new Set(nodes.map((n) => n.label));
    const shown: Record<string, string> = {};
    for (const [label, color] of Object.entries(colorMap)) {
      if (visibleLabels.has(label)) shown[label] = color;
    }
    return shown;
  }, [nodes, colorMap]);

  const shownNodes = useMemo(
    () => (selectedCategory ? nodes.filter((n) => n.label === selectedCategory) : nodes),
    [nodes, selectedCategory],
  );
  const shownIds = useMemo(() => new Set(shownNodes.map((n) => n.id)), [shownNodes]);
  const shownEdges = useMemo(
    () => edges.filter((e) => shownIds.has(e.source) && shownIds.has(e.target)),
    [edges, shownIds],
  );

  const canvasNodes = useMemo(
    () => toReagraphNodes(shownNodes, colorMap, state.expandedIds),
    [shownNodes, colorMap, state.expandedIds],
  );
  const canvasEdges = useMemo(() => toReagraphEdges(shownEdges), [shownEdges]);

  useEffect(() => {
    onGraphChange?.({ nodes, edges, totalNodes, colorMap });
  }, [nodes, edges, totalNodes, colorMap, onGraphChange]);

  const highlightedSet = useMemo(() => new Set(highlightedIds), [highlightedIds]);
  useEffect(() => {
    prunePins(highlightedSet);
  }, [highlightedSet, prunePins]);

  useEffect(() => {
    if (!focusedId) return;
    const requestId = (focusRequestRef.current += 1);
    void focusNode(focusedId).then(() => {
      if (requestId !== focusRequestRef.current) return;
      setSelectedId(focusedId);
      setSelectedEdgeId(null);
      pendingFocusRef.current = focusedId;
      setFocusTick((tick) => tick + 1);
    });
  }, [focusedId, focusNode]);

  useEffect(() => {
    const target = pendingFocusRef.current;
    if (!target) return;
    pendingFocusRef.current = null;
    if (!shownIds.has(target)) return;

    let frames = 0;
    let cancelled = false;
    const attempt = () => {
      if (cancelled) return;
      try {
        graphRef.current?.centerGraph([target]);
      } catch {
        if (frames++ < MAX_CENTER_FRAMES) requestAnimationFrame(attempt);
      }
    };
    attempt();
    return () => {
      cancelled = true;
    };
  }, [shownIds, focusTick]);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      const active = document.activeElement as HTMLElement | null;
      if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) return;
      setPick(null);
      setSelectedId(null);
      setSelectedEdgeId(null);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const selected: SelectedNode | null = useMemo(() => {
    if (!selectedId || !shownIds.has(selectedId)) return null;
    const node = state.nodes.get(selectedId);
    if (!node) return null;
    return {
      id: node.id,
      label: node.name || node.id,
      category: node.label,
      degree: node.degree,
      visibleDegree: visibleDegree(shownEdges, node.id),
      expanded: isExpanded(state, node.id),
      description: (node.properties.description as string | null | undefined) ?? null,
      aliases: (node.properties.aliases as string[] | undefined) ?? [],
    };
  }, [selectedId, shownIds, state, shownEdges]);

  const selectedEdge: SelectedEdge | null = useMemo(() => {
    const edge = shownEdges.find((e) => e.id === selectedEdgeId);
    if (!edge) return null;
    const name = (id: string) => state.nodes.get(id)?.name || id;
    return { id: edge.id, type: edge.type, source: name(edge.source), target: name(edge.target) };
  }, [selectedEdgeId, shownEdges, state]);

  // A selection takes over the highlight channel: while a node is selected we surface
  // its neighbourhood, and search hits come back once it is deselected.
  const actives = useMemo(() => {
    if (selected) {
      const { nodeIds, edgeIds } = adjacency(shownEdges, selected.id);
      return [...nodeIds, ...edgeIds];
    }
    const edge = shownEdges.find((e) => e.id === selectedEdgeId);
    if (edge) return [edge.source, edge.target, edge.id];
    return highlightedIds.filter((id) => shownIds.has(id));
  }, [selected, selectedEdgeId, shownEdges, highlightedIds, shownIds]);

  const selectNode = (id: string | null) => {
    setSelectedId(id);
    setSelectedEdgeId(null);
  };

  const clickNode = (id: string) => {
    if (pick && !pick.to) {
      if (id !== pick.from) setPick({ ...pick, to: id });
      return;
    }
    setPick(null);
    selectNode(id);
  };

  const nodeRef = (id: string) => ({ id, name: state.nodes.get(id)?.name || id });

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      wrapperRef.current?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  return (
    <div ref={wrapperRef} className={`flex flex-col h-full ${isFullscreen ? 'bg-white p-4' : ''}`}>
      <div className="relative flex-1 min-h-0 border border-gray-200 rounded-lg bg-white overflow-hidden">
        {isLoading && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-white">
            <div className="w-10 h-10 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin" />
            <p className="text-sm text-gray-500">Ładowanie grafu...</p>
          </div>
        )}

        {error && (
          <p className="absolute top-2 left-2 z-20 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5">
            {error}
          </p>
        )}

        <GraphCanvas
          ref={graphRef}
          nodes={canvasNodes}
          edges={canvasEdges}
          theme={lightTheme}
          layoutType="forceDirected2d"
          labelType="all"
          edgeLabelPosition="natural"
          edgeArrowPosition="end"
          edgeInterpolation="curved"
          minDistance={50}
          maxDistance={20000}
          draggable
          animated
          selections={selected ? [selected.id] : selectedEdge ? [selectedEdge.id] : []}
          actives={actives}
          onNodeClick={(node: InternalGraphNode) => clickNode(node.id)}
          onNodeDoubleClick={(node: InternalGraphNode) => void toggleNode(node.id)}
          onEdgeClick={(edge: InternalGraphEdge) => {
            if (pick) return;
            setSelectedId(null);
            setSelectedEdgeId(edge.id);
          }}
          onCanvasClick={() => {
            if (!pick) selectNode(null);
          }}
        />

        {pick && !pick.to && (
          <div className="absolute top-2 left-1/2 z-20 flex -translate-x-1/2 items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 shadow-sm">
            <span>
              Kliknij węzeł, {pick.kind === 'merge' ? 'z którym scalić' : 'z którym powiązać'} „
              {nodeRef(pick.from).name}”
            </span>
            <button
              onClick={() => setPick(null)}
              className="cursor-pointer text-xs font-medium text-slate-700 hover:underline"
            >
              Anuluj (Esc)
            </button>
          </div>
        )}

        {pick?.to ? (
          <PickPanel
            kind={pick.kind}
            from={nodeRef(pick.from)}
            to={nodeRef(pick.to)}
            edits={edits}
            onSwap={() => setPick({ ...pick, from: pick.to!, to: pick.from })}
            onDone={(id) => {
              setPick(null);
              selectNode(id);
            }}
            onCancel={() => setPick(null)}
          />
        ) : (
          selected &&
          !pick && (
            <DetailsPanel
              key={selected.id}
              spaceId={spaceId}
              node={selected}
              isPending={pendingId === selected.id}
              edits={edits}
              onToggleExpand={() => void toggleNode(selected.id)}
              onStartPick={(kind) => {
                edits.merge.reset();
                edits.addEdge.reset();
                setPick({ kind, from: selected.id, to: null });
              }}
              onClose={() => setSelectedId(null)}
            />
          )
        )}

        {selectedEdge && !pick && (
          <EdgeDetailsPanel
            key={selectedEdge.id}
            spaceId={spaceId}
            edge={selectedEdge}
            edits={edits}
            onReplaced={setSelectedEdgeId}
            onClose={() => setSelectedEdgeId(null)}
          />
        )}

        <div className="absolute bottom-2 left-2 z-10 text-xs text-gray-500 bg-white/90 border border-gray-200 rounded-lg px-2 py-1">
          {nodes.length} z {totalNodes} węzłów · podwójne kliknięcie rozwija
        </div>

        <button
          onClick={() => {
            // The modal opens over the page, which can't show over native fullscreen.
            if (document.fullscreenElement) void document.exitFullscreen();
            edits.addNode.reset();
            setCreating(true);
          }}
          className="absolute bottom-2 right-36 z-10 p-1.5 rounded-lg bg-white border border-gray-200 shadow-sm hover:bg-gray-50 text-gray-600"
        >
          + Węzeł
        </button>

        <NodeCreateModal
          open={creating}
          onOpenChange={setCreating}
          spaceId={spaceId}
          pending={edits.addNode.isPending}
          error={edits.addNode.error?.message ?? null}
          onSubmit={(fields) =>
            edits.addNode.mutate(fields, {
              onSuccess: (node) => {
                setCreating(false);
                setSelectedCategory(null);
                selectNode(node.id);
              },
            })
          }
          onShowExisting={(id) => {
            setCreating(false);
            setSelectedCategory(null);
            // Loaded and pinned first, as it may not be on the canvas yet.
            void focusNode(id).then(() => selectNode(id));
          }}
        />

        {duplicates.suggestions.length > 0 && (
          <button
            onClick={() => {
              if (document.fullscreenElement) void document.exitFullscreen();
              edits.merge.reset();
              duplicates.setOpen(true);
            }}
            className="absolute top-2 left-2 z-10 p-1.5 rounded-lg bg-amber-50 border border-amber-300 shadow-sm hover:bg-amber-100 text-amber-900"
          >
            Duplikaty ({duplicates.suggestions.length})
          </button>
        )}

        <DuplicatesModal
          open={duplicates.open}
          onOpenChange={duplicates.setOpen}
          spaceId={spaceId}
          suggestions={duplicates.suggestions}
          edits={edits}
          onShow={(id) => {
            duplicates.setOpen(false);
            setSelectedCategory(null);
            void focusNode(id).then(() => selectNode(id));
          }}
        />

        <button
          onClick={toggleFullscreen}
          className="absolute bottom-2 right-2 z-10 p-1.5 rounded-lg bg-white border border-gray-200 shadow-sm hover:bg-gray-50 text-gray-600"
          title={isFullscreen ? 'wyjdź z pełnego ekranu' : 'pełny ekran'}
        >
          {isFullscreen ? '✕ Wyjdź' : '⛶ Pełny ekran'}
        </button>
      </div>

      <Legend
        colorMap={legendColorMap}
        selectedCategory={selectedCategory}
        onCategoryClick={(category) =>
          setSelectedCategory((prev) => (prev === category ? null : category))
        }
      />
    </div>
  );
}
