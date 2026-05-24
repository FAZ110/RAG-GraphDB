import { useMemo } from 'react';
import type { NodeResult, EdgeResult } from '../../../types';
import { computeStats } from '../utils/graphStats';

export function useGraphStats(nodes: NodeResult[], edges: EdgeResult[]) {
  return useMemo(() => {
    const stats = computeStats(nodes, edges);
    const categoryEntries = Object.entries(stats.categoryCount).sort((a, b) => b[1] - a[1]);
    const edgeTypeEntries = Object.entries(stats.edgeTypeCount).sort((a, b) => b[1] - a[1]);
    return { ...stats, categoryEntries, edgeTypeEntries };
  }, [nodes, edges]);
}
