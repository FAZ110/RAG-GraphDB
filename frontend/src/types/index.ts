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