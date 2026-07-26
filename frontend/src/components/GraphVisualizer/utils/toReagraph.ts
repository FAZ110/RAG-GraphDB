import type { GraphEdge, GraphNode } from 'reagraph';
import type { LoadedEdge, LoadedNode } from '../../../types';
import { DEFAULT_COLOR } from './constants';

const MIN_SIZE = 5;
const MAX_SIZE = 20;

export interface NodeData {
  category: string;
  degree: number;
  expanded: boolean;
}

export function toReagraphNodes(
  nodes: LoadedNode[],
  colorMap: Record<string, string>,
  expandedIds: ReadonlySet<string>,
): GraphNode[] {
  return nodes.map((node) => ({
    id: node.id,
    label: node.name || node.id,
    fill: colorMap[node.label] ?? DEFAULT_COLOR,
    size: Math.min(MIN_SIZE + node.degree * 0.8, MAX_SIZE),
    data: {
      category: node.label,
      degree: node.degree,
      expanded: expandedIds.has(node.id),
    } satisfies NodeData,
  }));
}

export function toReagraphEdges(edges: LoadedEdge[]): GraphEdge[] {
  return edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    label: edge.type,
  }));
}
