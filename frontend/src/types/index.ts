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

export interface Space {
    id: string;
    name: string;
    created_at: string;
    article_count: number;
    entity_count: number;
}

export interface SpaceStats {
    articles: { total: number; by_status: Record<'ok' | 'pending' | 'processing' | 'error', number> };
    entities: { total: number; by_label: { label: string; count: number }[] };
    relationships: number;
}

export interface Article {
    id: string;
    url: string | null;
    title: string | null;
    status: 'pending' | 'processing' | 'ok' | 'error';
    error: string | null;
    nodes_count: number | null;
    edges_count: number | null;
    created_at: string;
    processed_at: string | null;
}

export interface MentionedEntity {
    name: string;
    label: string;
}

export interface ArticleRelationship {
    source: string;
    source_label: string;
    type: string;
    target: string;
    target_label: string;
}

export interface ArticleDetail extends Article {
    content: string;
    entities: MentionedEntity[];
    relationships: ArticleRelationship[];
}

export interface ArticlesDeleted {
    deleted: string[];
    processing: string[];
}

export interface FailedArticle {
    id: string;
    title: string;
    error: string | null;
    started_at: string | null;
}
