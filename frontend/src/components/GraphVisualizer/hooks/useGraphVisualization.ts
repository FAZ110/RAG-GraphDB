import { useRef, useState, useEffect, useMemo } from 'react';
import Sigma from 'sigma';
import { MultiDirectedGraph } from 'graphology';
import { EdgeArrowProgram } from 'sigma/rendering';
import forceAtlas2 from 'graphology-layout-forceatlas2';
import FA2LayoutSupervisor from 'graphology-layout-forceatlas2/worker';
import noverlap from 'graphology-layout-noverlap';
import type { NodeResult, EdgeResult } from '../../../types';
import { buildLabelColorMap } from '../utils/buildLabelColorMap';
import { DEFAULT_COLOR } from '../utils/constants';

export type SelectedElement =
  | {
      type: 'node';
      data: {
        id: string;
        label: string;
        category: string;
        inDegree: number;
        outDegree: number;
        edgeTypes: string[];
      };
    }
  | { type: 'edge'; data: { id: string; label: string; sourceName: string; targetName: string } };

interface NodeAttr extends Record<string, unknown> {
  label: string;
  category: string;
  color: string;
  size: number;
  x: number;
  y: number;
}

interface EdgeAttr extends Record<string, unknown> {
  label: string;
  color: string;
  size: number;
}

export function useGraphVisualization(
  nodes: NodeResult[],
  edges: EdgeResult[],
  highlightedIds: string[] = [],
  focusedId: string | null = null,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sigmaRef = useRef<Sigma<NodeAttr, EdgeAttr> | null>(null);
  const graphRef = useRef<MultiDirectedGraph<NodeAttr, EdgeAttr> | null>(null);
  const supervisorRef = useRef<FA2LayoutSupervisor<NodeAttr, EdgeAttr> | null>(null);

  const [selected, setSelected] = useState<SelectedElement | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const colorMap = useMemo(() => buildLabelColorMap(nodes), [nodes]);

  const selectedIdRef = useRef<string | null>(null);
  const selectedCategoryRef = useRef<string | null>(null);
  const highlightedIdsRef = useRef<Set<string>>(new Set());
  const focusedIdRef = useRef<string | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    highlightedIdsRef.current = new Set(highlightedIds);
  }, [highlightedIds]);

  useEffect(() => {
    selectedIdRef.current = selected?.data.id ?? null;
  }, [selected]);

  const toggleCategory = (label: string | null) => {
    const next = selectedCategoryRef.current === label ? null : label;
    selectedCategoryRef.current = next;
    setSelectedCategory(next);
    sigmaRef.current?.refresh();
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      wrapperRef.current?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    if (!containerRef.current) return;

    const graph = new MultiDirectedGraph<NodeAttr, EdgeAttr>();

    nodes.forEach((node) => {
      const degree = edges.filter((e) => e.source === node.id || e.target === node.id).length;
      graph.addNode(node.id, {
        label: String(node.properties?.name ?? node.label),
        category: node.label,
        color: colorMap[node.label] ?? DEFAULT_COLOR,
        size: 6 + Math.min(degree * 0.8, 16),
        x: (Math.random() - 0.5) * Math.sqrt(nodes.length) * 400,
        y: (Math.random() - 0.5) * Math.sqrt(nodes.length) * 400,
      });
    });

    edges.forEach((edge) => {
      const key = `${edge.source}__${edge.target}__${edge.type}`;
      if (graph.hasNode(edge.source) && graph.hasNode(edge.target) && !graph.hasEdge(key)) {
        graph.addEdgeWithKey(key, edge.source, edge.target, {
          label: edge.type,
          color: '#94a3b8',
          size: 1.5,
        });
      }
    });

    graphRef.current = graph;

    const order = graph.order;
    const fa2Settings = {
      linLogMode: false,
      outboundAttractionDistribution: true,
      strongGravityMode: true,
      gravity: 0.05,
      scalingRatio: Math.max(50, order * 2),
      barnesHutOptimize: true,
      barnesHutTheta: 0.5,
      slowDown: 1 + Math.log(order),
    };

    forceAtlas2.assign(graph, { iterations: 800, settings: fa2Settings });
    noverlap.assign(graph, {
      maxIterations: 800,
      settings: { margin: 20, expansion: 6 },
    });

    const sigma = new Sigma<NodeAttr, EdgeAttr>(graph, containerRef.current!, {
      defaultEdgeType: 'arrow',
      edgeProgramClasses: { arrow: EdgeArrowProgram as never },
      enableEdgeEvents: true,
      renderEdgeLabels: false,
      labelRenderedSizeThreshold: 9,
      labelDensity: 0.7,
      labelGridCellSize: 150,
      hideLabelsOnMove: true,
      hideEdgesOnMove: true,
      labelFont: 'Inter, system-ui, sans-serif',
      labelSize: 12,
      labelWeight: '500',
      labelColor: { color: '#1f2937' },
      zIndex: true,
      nodeReducer: (node, data) => {
        const graph = graphRef.current;
        const selectedId = selectedIdRef.current;
        const category = selectedCategoryRef.current;
        const highlighted = highlightedIdsRef.current;
        const focused = focusedIdRef.current;

        const isSelected = node === selectedId;
        const isFocused = node === focused;
        const hasFilter = category !== null || highlighted.size > 0;
        const passesCategory = !category || data.category === category;
        const passesSearch = highlighted.size === 0 || highlighted.has(node);

        const isNeighborOfSelected =
          !isSelected &&
          selectedId !== null &&
          graph !== null &&
          graph.hasNode(selectedId) &&
          graph.neighbors(selectedId).includes(node);

        const isVisible =
          !hasFilter ||
          (passesCategory && passesSearch) ||
          isSelected ||
          isNeighborOfSelected;

        const safeColor =
          typeof data.color === 'string' && data.color ? data.color : DEFAULT_COLOR;

        if (!isVisible) return { ...data, color: safeColor, hidden: true };

        return {
          ...data,
          color: isFocused ? '#f59e0b' : safeColor,
          highlighted: isSelected || isFocused,
          size: isSelected ? data.size * 1.4 : data.size,
          zIndex: isSelected || isFocused ? 10 : 1,
        };
      },
      edgeReducer: (edge, data) => {
        const graph = graphRef.current;
        if (!graph) return { ...data };

        const selectedId = selectedIdRef.current;
        const category = selectedCategoryRef.current;
        const highlighted = highlightedIdsRef.current;
        const hasFilter = category !== null || highlighted.size > 0;

        if (!hasFilter) return { ...data };

        const src = graph.source(edge);
        const tgt = graph.target(edge);
        const srcAttr = graph.getNodeAttributes(src);
        const tgtAttr = graph.getNodeAttributes(tgt);

        const srcPasses =
          (!category || srcAttr.category === category) &&
          (highlighted.size === 0 || highlighted.has(src));
        const tgtPasses =
          (!category || tgtAttr.category === category) &&
          (highlighted.size === 0 || highlighted.has(tgt));

        const isConnectedToSelected = src === selectedId || tgt === selectedId;

        if (isConnectedToSelected) {
          return { ...data, color: '#475569', size: 2.5 };
        }
        if (srcPasses && tgtPasses) return { ...data };
        return { ...data, hidden: true };
      },
    });

    sigmaRef.current = sigma;

    const supervisor = new FA2LayoutSupervisor<NodeAttr, EdgeAttr>(graph, {
      settings: fa2Settings,
    });
    supervisor.start();
    const stopTimer = setTimeout(() => {
      supervisor.stop();
      noverlap.assign(graph, {
        maxIterations: 800,
        settings: { margin: 20, expansion: 6 },
      });
      sigma.refresh();
    }, 10000);
    supervisorRef.current = supervisor;

    sigma.on('clickNode', ({ node }) => {
      const attrs = graph.getNodeAttributes(node);
      const inDeg = graph.inDegree(node);
      const outDeg = graph.outDegree(node);
      const edgeTypes = [
        ...new Set(
          [...graph.inEdges(node), ...graph.outEdges(node)].map(
            (e) => graph.getEdgeAttribute(e, 'label') as string,
          ),
        ),
      ];
      selectedIdRef.current = node;
      focusedIdRef.current = null;
      setSelected({
        type: 'node',
        data: {
          id: node,
          label: attrs.label,
          category: attrs.category,
          inDegree: inDeg,
          outDegree: outDeg,
          edgeTypes,
        },
      });
      sigma.refresh();
    });

    sigma.on('clickEdge', ({ edge }) => {
      const src = graph.source(edge);
      const tgt = graph.target(edge);
      const sourceName = graph.getNodeAttribute(src, 'label') as string;
      const targetName = graph.getNodeAttribute(tgt, 'label') as string;
      selectedIdRef.current = edge;
      focusedIdRef.current = null;
      setSelected({
        type: 'edge',
        data: {
          id: edge,
          label: graph.getEdgeAttribute(edge, 'label') as string,
          sourceName,
          targetName,
        },
      });
      sigma.refresh();
    });

    sigma.on('clickStage', () => {
      selectedIdRef.current = null;
      focusedIdRef.current = null;
      setSelected(null);
      sigma.refresh();
    });

    return () => {
      clearTimeout(stopTimer);
      supervisorRef.current?.kill();
      supervisorRef.current = null;
      sigmaRef.current?.kill();
      sigmaRef.current = null;
      graphRef.current = null;
    };
  }, [nodes, edges, colorMap]);

  useEffect(() => {
    sigmaRef.current?.refresh();
  }, [selectedCategory, highlightedIds, selected]);

  useEffect(() => {
    if (!sigmaRef.current || !graphRef.current || !focusedId) return;
    const sigma = sigmaRef.current;
    const graph = graphRef.current;
    if (!graph.hasNode(focusedId)) return;

    focusedIdRef.current = focusedId;
    selectedIdRef.current = focusedId;

    const displayData = sigma.getNodeDisplayData(focusedId);
    if (displayData) {
      sigma.getCamera().animate(
        { x: displayData.x, y: displayData.y, ratio: 0.3 },
        { duration: 350 },
      );
    }

    const attrs = graph.getNodeAttributes(focusedId);
    const inDeg = graph.inDegree(focusedId);
    const outDeg = graph.outDegree(focusedId);
    const edgeTypes = [
      ...new Set(
        [...graph.inEdges(focusedId), ...graph.outEdges(focusedId)].map(
          (e) => graph.getEdgeAttribute(e, 'label') as string,
        ),
      ),
    ];
    setSelected({
      type: 'node',
      data: {
        id: focusedId,
        label: attrs.label,
        category: attrs.category,
        inDegree: inDeg,
        outDegree: outDeg,
        edgeTypes,
      },
    });
    sigma.refresh();
  }, [focusedId, nodes, edges]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      const active = document.activeElement as HTMLElement | null;
      if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) return;
      selectedIdRef.current = null;
      focusedIdRef.current = null;
      setSelected(null);
      sigmaRef.current?.refresh();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  return {
    containerRef,
    selected,
    setSelected,
    colorMap,
    selectedCategory,
    toggleCategory,
    wrapperRef,
    isFullscreen,
    toggleFullscreen,
  };
}
