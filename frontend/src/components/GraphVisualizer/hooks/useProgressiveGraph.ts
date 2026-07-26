import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { fetchGraphSeed, fetchNodeExpansion } from '../../../services/api';
import {
  collapseNode,
  createGraphState,
  isExpanded,
  mergeExpansion,
  mergeSeed,
  pinNode,
  retainPins,
  visibleGraph,
} from '../utils/graphExpansion';
import type { GraphState } from '../utils/graphExpansion';

import type { ExpansionResponse } from '../../../types';

const SEED_LIMIT = 25;
const EXPAND_LIMIT = 25;

function rememberChunk(known: Set<string>, chunk: ExpansionResponse): void {
  known.add(chunk.root.id);
  for (const node of chunk.nodes) known.add(node.id);
}

export function useProgressiveGraph() {
  const [state, setState] = useState<GraphState>(createGraphState);
  const [totalNodes, setTotalNodes] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchedIds = useRef<Set<string>>(new Set());
  const epochRef = useRef(0);

  const knownIds = useRef<Set<string>>(new Set());

  const loadSeed = useCallback(async (epoch: number) => {
    const seed = await fetchGraphSeed(SEED_LIMIT);
    if (epoch !== epochRef.current) return;
    fetchedIds.current = new Set();
    knownIds.current = new Set(seed.nodes.map((n) => n.id));
    setState(mergeSeed(createGraphState(), { nodes: seed.nodes, edges: seed.edges }));
    setTotalNodes(seed.total_nodes);
    setError(null);
    setIsLoading(false);
  }, []);

  const handleSeedError = useCallback((epoch: number, err: unknown) => {
    if (epoch !== epochRef.current) return;
    setError((err as Error).message);
    setIsLoading(false);
  }, []);


  useEffect(() => {
    const epoch = (epochRef.current += 1);
    void loadSeed(epoch).catch((err: unknown) => handleSeedError(epoch, err));
  }, [loadSeed, handleSeedError]);


  const inFlight = useRef<Map<string, Promise<void>>>(new Map());

  const runExpansion = useCallback(async (id: string) => {
    try {
      const chunk = await fetchNodeExpansion(id, EXPAND_LIMIT);
      fetchedIds.current.add(id);
      rememberChunk(knownIds.current, chunk);
      setState((prev) =>
        mergeExpansion(prev, id, {
          nodes: [chunk.root, ...chunk.nodes],
          edges: chunk.edges,
        }),
      );
    } catch (err) {
      setError((err as Error).message);
    } finally {
      inFlight.current.delete(id);

      setPendingId((current) => (current === id ? null : current));
    }
  }, []);

  const expandNode = useCallback(
    async (id: string) => {
      if (fetchedIds.current.has(id)) {
        setState((prev) => mergeExpansion(prev, id, { nodes: [], edges: [] }));
        return;
      }
      const existing = inFlight.current.get(id);
      if (existing) {
        await existing;
        return;
      }
      setPendingId(id);
      setError(null);
      const request = runExpansion(id);
      inFlight.current.set(id, request);
      await request;
    },
    [runExpansion],
  );

  const focusNode = useCallback(async (id: string) => {
    if (knownIds.current.has(id)) {
      setState((prev) => pinNode(prev, id, { nodes: [], edges: [] }));
      return;
    }
    setError(null);
    try {
      const chunk = await fetchNodeExpansion(id, EXPAND_LIMIT);
      fetchedIds.current.add(id);
      rememberChunk(knownIds.current, chunk);
      setState((prev) =>
        pinNode(prev, id, { nodes: [chunk.root, ...chunk.nodes], edges: chunk.edges }),
      );
    } catch (err) {
      setError((err as Error).message);
    }
  }, []);

  const prunePins = useCallback((keep: ReadonlySet<string>) => {
    setState((prev) => retainPins(prev, keep));
  }, []);

  const collapse = useCallback((id: string) => {
    setState((prev) => collapseNode(prev, id));
  }, []);

  const toggleNode = useCallback(
    async (id: string) => {
      if (isExpanded(state, id)) {
        collapse(id);
        return;
      }
      await expandNode(id);
    },
    [state, collapse, expandNode],
  );
  const { nodes, edges } = useMemo(() => visibleGraph(state), [state]);

  return {
    nodes,
    edges,
    state,
    totalNodes,
    isLoading,
    pendingId,
    error,
    expandNode,
    focusNode,
    prunePins,
    collapse,
    toggleNode,
  };
}
