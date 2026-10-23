import type { ExpansionResponse, GraphChunk, LoadedEdge, LoadedNode } from '../../../types';

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

export function adjacency(
  edges: readonly LoadedEdge[],
  nodeId: string,
): { nodeIds: string[]; edgeIds: string[] } {
  const nodeIds = new Set<string>();
  const edgeIds: string[] = [];
  for (const edge of edges) {
    if (edge.source !== nodeId && edge.target !== nodeId) continue;
    nodeIds.add(edge.source === nodeId ? edge.target : edge.source);
    edgeIds.push(edge.id);
  }
  return { nodeIds: [...nodeIds], edgeIds };
}

function withDegree(nodes: Map<string, LoadedNode>, id: string, delta: number): void {
  const node = nodes.get(id);
  if (node) nodes.set(id, { ...node, degree: Math.max(node.degree + delta, 0) });
}

/** Adds or replaces a node; a new one is pinned, so it shows up. */
export function upsertNode(state: GraphState, node: LoadedNode): GraphState {
  const nodes = new Map(state.nodes);
  const isNew = !nodes.has(node.id);
  nodes.set(node.id, node);
  if (!isNew) return { ...state, nodes };
  return { ...state, nodes, pinnedIds: new Set(state.pinnedIds).add(node.id) };
}

export function removeNode(state: GraphState, nodeId: string): GraphState {
  const nodes = new Map(state.nodes);
  nodes.delete(nodeId);
  const edges = new Map(state.edges);
  for (const [id, edge] of state.edges) {
    if (edge.source !== nodeId && edge.target !== nodeId) continue;
    edges.delete(id);
    withDegree(nodes, edge.source === nodeId ? edge.target : edge.source, -1);
  }
  const without = (ids: ReadonlySet<string>) => {
    const next = new Set(ids);
    next.delete(nodeId);
    return next;
  };
  return {
    nodes,
    edges,
    seedIds: without(state.seedIds),
    expandedIds: without(state.expandedIds),
    pinnedIds: without(state.pinnedIds),
  };
}

/** Adds an edge, or swaps `replacedId` for it; both ends are pinned so it shows up. */
export function upsertEdge(state: GraphState, edge: LoadedEdge, replacedId?: string): GraphState {
  const nodes = new Map(state.nodes);
  const edges = new Map(state.edges);
  if (replacedId) edges.delete(replacedId);
  if (!replacedId && !edges.has(edge.id)) {
    withDegree(nodes, edge.source, 1);
    withDegree(nodes, edge.target, 1);
  }
  edges.set(edge.id, edge);
  const pinnedIds = new Set(state.pinnedIds).add(edge.source).add(edge.target);
  return { ...state, nodes, edges, pinnedIds };
}

export function removeEdge(state: GraphState, edgeId: string): GraphState {
  const edge = state.edges.get(edgeId);
  if (!edge) return state;
  const nodes = new Map(state.nodes);
  const edges = new Map(state.edges);
  edges.delete(edgeId);
  withDegree(nodes, edge.source, -1);
  withDegree(nodes, edge.target, -1);
  return { ...state, nodes, edges };
}

/** `mergedId` is gone and the kept node's links were rebuilt, so they come fresh from `kept`. */
export function applyMerge(state: GraphState, mergedId: string, kept: ExpansionResponse): GraphState {
  const keepId = kept.root.id;
  const wasExpanded = state.expandedIds.has(mergedId) || state.expandedIds.has(keepId);
  const cleared = removeNode(state, mergedId);
  const edges = new Map(cleared.edges);
  for (const [id, edge] of cleared.edges) {
    if (edge.source === keepId || edge.target === keepId) edges.delete(id);
  }
  const { nodes: mergedNodes, edges: mergedEdges } = withChunk(
    { ...cleared, edges },
    { nodes: [kept.root, ...kept.nodes], edges: kept.edges },
  );
  const expandedIds = new Set(cleared.expandedIds);
  if (wasExpanded) expandedIds.add(keepId);
  return {
    nodes: mergedNodes,
    edges: mergedEdges,
    seedIds: cleared.seedIds,
    expandedIds,
    pinnedIds: new Set(cleared.pinnedIds).add(keepId),
  };
}
