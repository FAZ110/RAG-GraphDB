import type { NodeResult, EdgeResult } from "../../../types";

type AdjList = Map<string, string[]>;


// building adjacency list
function buildAdjList(nodes: NodeResult[], edges: EdgeResult[], directed: boolean): AdjList{
    const adj: AdjList = new Map();

    for (const node of nodes) adj.set(node.id, []);
    for (const edge of edges){
        adj.get(edge.source)?.push(edge.target);
        if (!directed) adj.get(edge.target)?.push(edge.source);
    }
    return adj;
}

// returns transposed graph (every edge inverted)
function buildTransposed(nodes: NodeResult[], edges: EdgeResult[]): AdjList{
    const adj: AdjList = new Map();

    for (const node of nodes) adj.set(node.id, []);
    for (const edge of edges) adj.get(edge.target)?.push(edge.source);

    return adj
}

// iterative dfs, returns list of visited nodes
function dfsVisit(startId: string, adj: AdjList, visited: Set<string>): string[]{
    
    const component: string[] = [];
    const stack = [startId];
    while (stack.length > 0){
        const id = stack.pop()!;
        if (visited.has(id)) continue;
        visited.add(id);
        component.push(id);

        for (const neighbour of adj.get(id) ?? []){
            if (!visited.has(neighbour)) stack.push(neighbour);
        }
    }

    return component
}


// dfs, collecting edges in order (kosaraju step 1)
function dfsFinishOrder(startId: string, adj: AdjList, visited: Set<string>, finishStack: string[]): void{

    const stack: { id: string; processed: boolean }[] = [{ id: startId, processed: false }];
    while (stack.length > 0) {
        const frame = stack[stack.length - 1];
        if (!frame.processed) {
            if (visited.has(frame.id)) { stack.pop(); continue; }
            visited.add(frame.id);
            frame.processed = true;
            for (const neighbor of adj.get(frame.id) ?? []) {
                if (!visited.has(neighbor)) stack.push({ id: neighbor, processed: false });
            }
        } else {
            stack.pop();
            finishStack.push(frame.id); 
        }
    }
}


export function findConnectedComponents({nodes, edges}: {nodes: NodeResult[], edges: EdgeResult[]}): {
    count: number;
    components: string[][];
}{
    const adj = buildAdjList(nodes, edges, false);
    const visited = new Set<string>();
    const components: string[][] = [];

    for (const node of nodes){
        if (!visited.has(node.id)){
            components.push(dfsVisit(node.id, adj, visited))
        }
    }

    return {count: components.length, components}
}


export function kosaraju({ nodes, edges }: { nodes: NodeResult[]; edges: EdgeResult[] }): {
    count: number;
    components: string[][];
} {
    const adj = buildAdjList(nodes, edges, true);
    const transposed = buildTransposed(nodes, edges);

    const visited = new Set<string>();
    const finishStack: string[] = [];
    for (const node of nodes) {
        if (!visited.has(node.id)) dfsFinishOrder(node.id, adj, visited, finishStack);
    }

    const visited2 = new Set<string>();
    const components: string[][] = [];
    while (finishStack.length > 0) {
        const nodeId = finishStack.pop()!;
        if (!visited2.has(nodeId)) {
            components.push(dfsVisit(nodeId, transposed, visited2));
        }
    }

    return { count: components.length, components };
}
