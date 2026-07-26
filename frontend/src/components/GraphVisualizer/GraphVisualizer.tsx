import { useEffect, useMemo, useRef, useState } from 'react';
import { GraphCanvas, lightTheme } from 'reagraph';
import type { GraphCanvasRef, InternalGraphNode } from 'reagraph';
import { useProgressiveGraph } from './hooks/useProgressiveGraph';
import { adjacency, isExpanded, visibleDegree } from './utils/graphExpansion';
import { toReagraphEdges, toReagraphNodes } from './utils/toReagraph';
import { buildLabelColorMap } from './utils/buildLabelColorMap';
import { DetailsPanel } from './components/DetailsPanel';
import type { SelectedNode } from './components/DetailsPanel';
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
  highlightedIds?: string[];
  focusedId?: string | null;
  onGraphChange?: (snapshot: GraphSnapshot) => void;
}

export function GraphVisualizer({ highlightedIds = [], focusedId = null, onGraphChange }: Props) {
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
  } = useProgressiveGraph();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
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
      setSelectedId(null);
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
    };
  }, [selectedId, shownIds, state, shownEdges]);

  // A selection takes over the highlight channel: while a node is selected we surface
  // its neighbourhood, and search hits come back once it is deselected.
  const actives = useMemo(() => {
    if (selected) {
      const { nodeIds, edgeIds } = adjacency(shownEdges, selected.id);
      return [...nodeIds, ...edgeIds];
    }
    return highlightedIds.filter((id) => shownIds.has(id));
  }, [selected, shownEdges, highlightedIds, shownIds]);

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
          selections={selected ? [selected.id] : []}
          actives={actives}
          onNodeClick={(node: InternalGraphNode) => setSelectedId(node.id)}
          onNodeDoubleClick={(node: InternalGraphNode) => void toggleNode(node.id)}
          onCanvasClick={() => setSelectedId(null)}
        />

        {selected && (
          <DetailsPanel
            node={selected}
            isPending={pendingId === selected.id}
            onToggleExpand={() => void toggleNode(selected.id)}
            onClose={() => setSelectedId(null)}
          />
        )}

        <div className="absolute bottom-2 left-2 z-10 text-xs text-gray-500 bg-white/90 border border-gray-200 rounded-lg px-2 py-1">
          {nodes.length} z {totalNodes} węzłów · dwuklik rozwija
        </div>

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
