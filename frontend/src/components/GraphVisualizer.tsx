import { useRef, useEffect } from 'react';
import cytoscape, { type StylesheetStyle } from 'cytoscape';
import type { GraphResponse } from '../types';

const stylesheet: StylesheetStyle[] = [
  {
    selector: 'node',
    style: {
      'background-color': '#10b981',
      'label': 'data(label)',
      'color': '#1f2937',
      'font-size': '12px',
      'text-valign': 'top',
      'text-halign': 'center',
      'text-background-color': '#ffffff',
      'text-background-opacity': 0.8,
      'text-background-padding': '2px',
      'text-background-shape': 'roundrectangle',
    },
  },
  {
    selector: 'edge',
    style: {
      'width': 2,
      'line-color': '#94a3b8',
      'target-arrow-color': '#94a3b8',
      'target-arrow-shape': 'triangle',
      'curve-style': 'bezier',
      'label': 'data(label)',
      'font-size': '10px',
      'text-rotation': 'autorotate',
      'text-margin-y': -10,
      'color': '#64748b',
    },
  },
];

export function GraphVisualizer({ nodes, edges }: GraphResponse) {
  const containerRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (!containerRef.current) return;

    const cy = cytoscape({
      container: containerRef.current,
      elements,
      style: stylesheet,
      layout: { name: 'cose' },
    });

    return () => cy.destroy();
  }, [nodes, edges]);

  return (
    <div
      ref={containerRef}
      className="w-full h-100 border border-gray-200 rounded-lg bg-gray-50 mt-4"
    />
  );
}