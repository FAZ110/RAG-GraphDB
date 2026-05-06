export interface ExtractRequest{
    url?: string;
    title?: string;
    content: string;
}

export interface ExtractResponse{
    status: string;
    executed_code?: string;
    error?: string;
}