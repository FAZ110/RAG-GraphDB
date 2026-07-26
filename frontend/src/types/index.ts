export interface ArticleRequest {
    url?: string;
    title?: string;
    content: string;
}


export interface ArticleResult {
    title?: string;
    status: string;
    nodes?: NodeResult[];
    edges?: EdgeResult[];
    nodes_count?: number;
    edges_count?: number;
    error?: string;
}

export interface BulkExtractResponse {
    results: ArticleResult[];
}

export interface BulkExtractRequest {
    articles: ArticleRequest[];
    provider: string
}


export interface NodeResult {
    id: string;
    label: string
    properties: Record<string, unknown>
}

export interface EdgeResult {
    source: string;
    target: string;
    type: string;
    properties: Record<string, unknown>
}

export interface GraphResponse {
    nodes: NodeResult[]
    edges: EdgeResult[]
}

export interface UploadedFile {
    id: string;
    fileName: string;
    articles: ArticleRequest[];
}

export interface JobSubmitResponse {
    job_id: string;
}

export interface SimilarNode {
    id: string;
    name: string;
    label: string;
    score: number;
}

export interface LoadedNode {
    id: string;
    label: string;
    name: string;
    degree: number;
    properties: Record<string, unknown>;
}

export interface LoadedEdge {
    id: string;
    source: string;
    target: string;
    type: string;
}

export interface GraphChunk {
    nodes: LoadedNode[];
    edges: LoadedEdge[];
}

export interface SeedResponse extends GraphChunk {
    total_nodes: number;
}

export interface ExpansionResponse extends GraphChunk {
    root: LoadedNode;
}
