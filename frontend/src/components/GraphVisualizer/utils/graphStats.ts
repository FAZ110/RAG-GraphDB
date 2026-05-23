import type { EdgeResult, NodeResult } from '../../../types';

export function computeStats(nodes: NodeResult[], edges: EdgeResult[]) {
    const N = nodes.length;
    const E = edges.length;

    const density = N > 1 ? E / (N*(N-1)) : 0;
    const avgDegree = N > 0 ? (E*2) / N : 0;

    const categoryCount: Record<string, number> = {};
    nodes.forEach(node => { categoryCount[node.label] = (categoryCount[node.label] ?? 0) + 1; });

    const edgeTypeCount: Record<string, number> = {};
    edges.forEach(edge => { edgeTypeCount[edge.type] = (edgeTypeCount[edge.type] ?? 0) + 1; });

    const degreeMap = new Map<string, { in: number; out: number }>();
    nodes.forEach(node => degreeMap.set(node.id, { in: 0, out: 0 }));

    edges.forEach(edge => {
        if (degreeMap.has(edge.source)) degreeMap.get(edge.source)!.out++;
        if (degreeMap.has(edge.target)) degreeMap.get(edge.target)!.in++;
    });

    const topNodes = nodes.map(node => {
        const deg = degreeMap.get(node.id) ?? { in: 0, out: 0 };
        return { name: node.properties.name as string, total: deg.in + deg.out, in: deg.in, out: deg.out };
    })
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

    const isolated = nodes.filter(node => {
        const d = degreeMap.get(node.id) ?? { in: 0, out: 0 };
        return d.in + d.out === 0;
    }).length;

    return { N, E, density, avgDegree, categoryCount, edgeTypeCount, topNodes, isolated };
}