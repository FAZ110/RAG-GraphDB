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

function applyCategoryHighlight(cy: Core, category: string | null) {
  if (category === null) {
    cy.nodes().style('opacity', 1);
  } else {
    cy.nodes().style('opacity', 0.15);
    cy.nodes(`[category = "${category}"]`).style('opacity', 1);
  }
}

export function useGraphVisualization(nodes: NodeResult[], edges: EdgeResult[]) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<SelectedElement | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const colorMap = useMemo(() => buildLabelColorMap(nodes), [nodes]);

  const selectedCategoryRef = useRef<string | null>(null);
  const cyRef = useRef<Core | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

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

    cy.on('mouseover', 'node', (evt) => {
      const node = evt.target;
      cy.elements().not(node.neighborhood().add(node)).style('opacity', 0.2);
    });

    cy.on('mouseout', 'node', () => {
      applyCategoryHighlight(cy, selectedCategoryRef.current);
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

      cy.animate({
        center: { eles: selectedElement },
        duration: 300,
      });
    }
  }, [selected]);

  useEffect(() => {
    if (cyRef.current) applyCategoryHighlight(cyRef.current, selectedCategory);
  }, [selectedCategory, nodes, edges]);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, [])

  return { containerRef, cyRef, selected, setSelected, colorMap, selectedCategory, toggleCategory, wrapperRef, isFullscreen, toggleFullscreen };
}