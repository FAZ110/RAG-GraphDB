import { useRef, useState, useEffect, useMemo } from 'react';
import cytoscape, { type StylesheetStyle, type Core } from 'cytoscape';
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
      }
    }
  | { type: 'edge'; data: { id: string; label: string; sourceName: string; targetName: string } };

function escapeSelectorValue(value: string): string {
  return value.replace(/"/g, '\\"');
}

function applyVisibility(
  cy: Core,
  category: string | null,
  highlightedIds: string[],
  selectedId: string | null,
) {
  const hasSearch = highlightedIds.length > 0;
  const hasCategory = category !== null;
  const hasSelected = selectedId !== null;

  if (!hasSearch && !hasCategory && !hasSelected) {
    cy.nodes().style('opacity', 1);
    cy.edges().style('opacity', 1);
    return;
  }

  cy.nodes().style('opacity', 0.15);
  cy.edges().style('opacity', 0.15);

  let visible = cy.collection();
  if (hasSearch) {
    visible = highlightedIds.reduce(
      (acc, id) => acc.union(cy.getElementById(id)),
      cy.collection(),
    );
    if (hasCategory) {
      visible = visible.filter(`[category = "${escapeSelectorValue(category!)}"]`);
    }
  } else if (hasCategory) {
    visible = cy.nodes(`[category = "${escapeSelectorValue(category!)}"]`);
  }

  visible.style('opacity', 1);
  visible.edgesWith(visible).style('opacity', 1);

  if (hasSelected) {
    const selectedNode = cy.getElementById(selectedId!);
    selectedNode.style('opacity', 1);
    selectedNode.connectedEdges().style('opacity', 1);
    selectedNode.neighborhood('node').style('opacity', 1);
  }
}

export function useGraphVisualization(
  nodes: NodeResult[],
  edges: EdgeResult[],
  highlightedIds: string[] = [],
  focusedId: string | null = null,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<SelectedElement | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const colorMap = useMemo(() => buildLabelColorMap(nodes), [nodes]);

  const selectedCategoryRef = useRef<string | null>(null);
  const highlightedIdsRef = useRef<string[]>(highlightedIds);
  const selectedIdRef = useRef<string | null>(null);
  const cyRef = useRef<Core | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    highlightedIdsRef.current = highlightedIds;
  }, [highlightedIds]);

  useEffect(() => {
    selectedIdRef.current = selected?.data.id ?? null;
  }, [selected]);

  const toggleCategory = (label: string | null) => {
    const next = selectedCategoryRef.current === label ? null : label;
    selectedCategoryRef.current = next;
    setSelectedCategory(next);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement){
        wrapperRef.current?.requestFullscreen();
    }else{
        document.exitFullscreen();
    }
  }

  useEffect(() => {
    if (!containerRef.current) return;

    const container = document.createElement('div');
    container.style.width = '100%';
    container.style.height = '100%';
    containerRef.current.appendChild(container);

    const elements = [
      ...nodes.map((node) => ({
        data: {
          id: node.id,
          label: node.properties.name as string,
          name: node.properties.name as string,
          category: node.label,
        },
      })),
      ...edges.map((edge) => ({
        data: {
          id: `${edge.source}__${edge.target}__${edge.type}`,
          source: edge.source,
          target: edge.target,
          label: edge.type,
        },
      })),
    ];

    const categoryStyles: StylesheetStyle[] = Object.entries(colorMap).map(([label, color]) => ({
      selector: `node[category = "${label}"]`,
      style: { 'background-color': color },
    }));

    const stylesheet: StylesheetStyle[] = [
      {
        selector: 'node',
        style: {
            'background-color': DEFAULT_COLOR,
            label: 'data(label)',
            color: '#1f2937',
            'font-size': '12px',
            'text-valign': 'top',
            'text-halign': 'center',
            'text-background-color': '#ffffff',
            'text-background-opacity': 0.8,
            'text-background-padding': '2px',
            'text-background-shape': 'roundrectangle',
        },
      },
      ...categoryStyles,
      {
        selector: 'edge',
        style: {
            width: 2,
            'line-color': '#94a3b8',
            'target-arrow-color': '#94a3b8',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            label: 'data(label)',
            'font-size': '10px',
            'text-rotation': 'autorotate',
            'text-margin-y': -10,
            color: '#64748b',
        },
      },
      {
        selector: '.selected',
        style:{
            'border-width': 4,
            'border-color': '#000000',
        }
      },
      {
        selector: '.semantic-focused',
        style: {
            'border-width': 6,
            'border-color': '#000000',
            'border-opacity': 1,
        }
      }
    ];

    const cy = cytoscape({
      container,
      elements,
      style: stylesheet,
      layout: { name: 'cose' },
    });

    cyRef.current = cy;

    cy.on('tap', 'node', (evt) => {
      const node = evt.target;
      const data = node.data() as { id: string; label: string; category: string };
      const inDegree = node.indegree(false);
      const outDegree = node.outdegree(false);

      const edgeTypes = [... new Set<string>(
        node.connectedEdges().map((e: {data: (key: string) => string}) => e.data('label'))
      )]
      setSelected({ type: 'node', data: {...data, inDegree, outDegree, edgeTypes} });
    });

    cy.on('tap', 'edge', (evt) => {
      const raw = evt.target.data() as { id: string; source: string; target: string; label: string };
      const sourceName = nodes.find((n) => n.id === raw.source)?.properties.name as string ?? raw.source;
      const targetName = nodes.find((n) => n.id === raw.target)?.properties.name as string ?? raw.target;
      setSelected({ type: 'edge', data: { id: raw.id, label: raw.label, sourceName, targetName } });
    });

    cy.on('tap', (evt) => {
      if (evt.target === cy) setSelected(null);
    });

    return () => {
        container.remove();
        cy.destroy();
        cyRef.current = null;
    };
  }, [nodes, edges, colorMap]);


  useEffect(() => {
    if (!cyRef.current) return;
    const cy = cyRef.current;

    cy.elements().removeClass('selected');

    if (selected) {
      const selectedElement = cy.getElementById(selected.data.id);
      selectedElement.addClass('selected');
    }
  }, [selected]);

  useEffect(() => {
    if (cyRef.current) {
      applyVisibility(
        cyRef.current,
        selectedCategory,
        highlightedIds,
        selected?.data.id ?? null,
      );
    }
  }, [selectedCategory, highlightedIds, selected, nodes, edges]);

  useEffect(() => {
    if (!cyRef.current) return;
    const cy = cyRef.current;
    cy.elements().removeClass('semantic-focused');
    if (!focusedId) return;
    const node = cy.getElementById(focusedId);
    if (node.length === 0) return;
    node.addClass('semantic-focused');
    cy.stop(true, true);
    cy.animate({ center: { eles: node }, zoom: 1.2, duration: 350 });

    const data = node.data() as { id: string; label: string; category: string };
    const inDegree = node.indegree(false);
    const outDegree = node.outdegree(false);
    const edgeTypes = [
      ...new Set<string>(
        node.connectedEdges().map((e: { data: (key: string) => string }) => e.data('label')),
      ),
    ];
    setSelected({ type: 'node', data: { ...data, inDegree, outDegree, edgeTypes } });
  }, [focusedId, nodes, edges]);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      const active = document.activeElement as HTMLElement | null;
      if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) return;
      setSelected(null);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return { containerRef, cyRef, selected, setSelected, colorMap, selectedCategory, toggleCategory, wrapperRef, isFullscreen, toggleFullscreen };
}