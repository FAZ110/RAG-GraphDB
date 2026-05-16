export interface ArticleRequest {
    url?: string;
    title?: string;
    content: string;
}

export interface BulkExtractRequest {
    articles: ArticleRequest[];
}

export interface ArticleResult {
    title?: string;
    status: string;
    executed_code?: string;
    error?: string;
}

export interface BulkExtractResponse {
    results: ArticleResult[];
}
