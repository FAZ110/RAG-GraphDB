import type { GraphChunk, LoadedEdge, LoadedNode } from '../../../types';

export interface GraphState {
  readonly nodes: ReadonlyMap<string, LoadedNode>;
  readonly edges: ReadonlyMap<string, LoadedEdge>;
  readonly seedIds: ReadonlySet<string>;
  readonly expandedIds: ReadonlySet<string>;
  readonly pinnedIds: ReadonlySet<string>;
}

export function createGraphState(): GraphState {
  return {
    nodes: new Map(),
    edges: new Map(),
    seedIds: new Set(),
    expandedIds: new Set(),
    pinnedIds: new Set(),
  };
}

function withChunk(state: GraphState, chunk: GraphChunk) {
  const nodes = new Map(state.nodes);
  for (const node of chunk.nodes) {
    nodes.set(node.id, node);
  }
  const edges = new Map(state.edges);
  for (const edge of chunk.edges) {
    edges.set(edge.id, edge);
  }
  return { nodes, edges };
}

export function mergeSeed(state: GraphState, chunk: GraphChunk): GraphState {
  const { nodes, edges } = withChunk(state, chunk);
  const seedIds = new Set(state.seedIds);
  for (const node of chunk.nodes) {
    seedIds.add(node.id);
  }
  return { nodes, edges, seedIds, expandedIds: state.expandedIds, pinnedIds: state.pinnedIds };
}

export function mergeExpansion(
  state: GraphState,
  nodeId: string,
  chunk: GraphChunk,
): GraphState {
  const { nodes, edges } = withChunk(state, chunk);
  const expandedIds = new Set(state.expandedIds);
  expandedIds.add(nodeId);
  return { nodes, edges, seedIds: state.seedIds, expandedIds, pinnedIds: state.pinnedIds };
}

export function pinNode(state: GraphState, nodeId: string, chunk: GraphChunk): GraphState {
  const isNoop =
    state.pinnedIds.has(nodeId) && chunk.nodes.length === 0 && chunk.edges.length === 0;
  if (isNoop) return state;

  const { nodes, edges } = withChunk(state, chunk);
  const pinnedIds = new Set(state.pinnedIds);
  pinnedIds.add(nodeId);
  return { nodes, edges, seedIds: state.seedIds, expandedIds: state.expandedIds, pinnedIds };
}

export function retainPins(state: GraphState, keep: ReadonlySet<string>): GraphState {
  if (state.pinnedIds.size === 0) return state;
  const pinnedIds = new Set<string>();
  for (const id of state.pinnedIds) {
    if (keep.has(id)) pinnedIds.add(id);
  }
  if (pinnedIds.size === state.pinnedIds.size) return state;
  return { ...state, pinnedIds };
}

export function collapseNode(state: GraphState, nodeId: string): GraphState {
  if (!state.expandedIds.has(nodeId)) return state;
  const expandedIds = new Set(state.expandedIds);
  expandedIds.delete(nodeId);
  return {
    nodes: state.nodes,
    edges: state.edges,
    seedIds: state.seedIds,
    expandedIds,
    pinnedIds: state.pinnedIds,
  };
}

export function isExpanded(state: GraphState, nodeId: string): boolean {
  return state.expandedIds.has(nodeId);
}

function visibleNodeIds(state: GraphState): Set<string> {
  const visible = new Set<string>();
  for (const id of state.seedIds) {
    if (state.nodes.has(id)) visible.add(id);
  }
  for (const id of state.expandedIds) {
    if (state.nodes.has(id)) visible.add(id);
  }
  for (const id of state.pinnedIds) {
    if (state.nodes.has(id)) visible.add(id);
  }
  for (const edge of state.edges.values()) {
    if (state.expandedIds.has(edge.source) && state.nodes.has(edge.target)) {
      visible.add(edge.target);
    }
    if (state.expandedIds.has(edge.target) && state.nodes.has(edge.source)) {
      visible.add(edge.source);
    }
  }
  return visible;
}

export function visibleGraph(state: GraphState): {
  nodes: LoadedNode[];
  edges: LoadedEdge[];
} {
  const visible = visibleNodeIds(state);
  const nodes: LoadedNode[] = [];
  for (const id of visible) {
    const node = state.nodes.get(id);
    if (node) nodes.push(node);
  }
  const edges: LoadedEdge[] = [];
  for (const edge of state.edges.values()) {
    if (visible.has(edge.source) && visible.has(edge.target)) edges.push(edge);
  }
  return { nodes, edges };
}


export function visibleDegree(edges: readonly LoadedEdge[], nodeId: string): number {
  let count = 0;
  for (const edge of edges) {
    if (edge.source === nodeId || edge.target === nodeId) count += 1;
  }
  return count;
}
