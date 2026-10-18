import type { BulkExtractRequest, ExpansionResponse, FailedArticle, JobSubmitResponse, SeedResponse, SimilarNode, Space, SpaceStats, Article, ArticleDetail, ArticlesDeleted } from '../types';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000';

export const DEFAULT_SPACE = 'default';

const readError = async (response: Response): Promise<string> => {
  const body: unknown = await response.json().catch(() => null);
  const detail = (body as { detail?: unknown } | null)?.detail;
  return typeof detail === 'string' ? detail : `Server error: ${response.status}`;
}

export const submitExtract = async (data: BulkExtractRequest): Promise<JobSubmitResponse> => {
  const response = await fetch (`${API_URL}/extract`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(data),
  })

  const responseData = await response.json().catch(() => ({}));
    if (!response.ok) {
        const backendMessage = responseData.detail?.[0]?.msg || responseData.detail || responseData.error;
        throw new Error(backendMessage || `Server error: ${response.status}`);
    }
    return responseData as JobSubmitResponse;
  
}

export const createExtractStream = (jobId: string): EventSource => 
  new EventSource(`${API_URL}/extract/stream/${jobId}`);


export const deleteGraph = async (): Promise<void> => {
  const response = await fetch(`${API_URL}/graph`, {
    method: 'DELETE'
  })
  if (!response.ok) throw new Error(await readError(response));
}

export const fetchSimilarNodes = async (q: string, topK = 10): Promise<SimilarNode[]> => {
  const response = await fetch(
    `${API_URL}/graph/similar?q=${encodeURIComponent(q)}&top_k=${topK}`
  );
  if (!response.ok) throw new Error(await readError(response));
  return response.json();
}

export const fetchGraphSeed = async (limit = 25): Promise<SeedResponse> => {
  const response = await fetch(`${API_URL}/graph/seed?limit=${limit}`);
  if (!response.ok) throw new Error(await readError(response));
  return response.json();
}

export const fetchNodeExpansion = async (
  nodeId: string,
  limit = 25,
): Promise<ExpansionResponse> => {
  const response = await fetch(
    `${API_URL}/graph/expand/${encodeURIComponent(nodeId)}?limit=${limit}`
  );
  if (!response.ok) throw new Error(await readError(response));
  return response.json();
}

export const fetchSpaces = async (): Promise<Space[]> => {
  const response = await fetch(`${API_URL}/spaces`);
  if (!response.ok) throw new Error(await readError(response));
  return response.json();
}

export const fetchSpaceStats = async (id: string): Promise<SpaceStats> => {
  const response = await fetch(`${API_URL}/spaces/${encodeURIComponent(id)}/stats`);
  if (!response.ok) throw new Error(await readError(response));
  return response.json();
}

export const fetchSpaceArticles = async (id: string): Promise<Article[]> => {
  const response = await fetch(`${API_URL}/spaces/${encodeURIComponent(id)}/articles`);
  if (!response.ok) throw new Error(await readError(response));
  return response.json();
}

export const createSpace = async (name: string): Promise<Space> => {
  const response = await fetch(`${API_URL}/spaces`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  if (!response.ok) throw new Error(await readError(response));
  return response.json();
}

export const renameSpace = async (id: string, name: string): Promise<Space> => {
  const response = await fetch(`${API_URL}/spaces/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  if (!response.ok) throw new Error(await readError(response));
  return response.json();
}

export const deleteSpace = async (id: string): Promise<void> => {
  const response = await fetch(`${API_URL}/spaces/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error(await readError(response));
}

export const reorderSpaces = async (spaceIds: string[]): Promise<void> => {
  const response = await fetch(`${API_URL}/spaces/order`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ space_ids: spaceIds }),
  });
  if (!response.ok) throw new Error(await readError(response));
}

export const fetchArticle = async (spaceId: string, articleId: string): Promise<ArticleDetail> => {
  const response = await fetch(
    `${API_URL}/spaces/${encodeURIComponent(spaceId)}/articles/${encodeURIComponent(articleId)}`,
  );
  if (!response.ok) throw new Error(await readError(response));
  return response.json();
}

export const deleteArticles = async (spaceId: string, articleIds: string[]): Promise<ArticlesDeleted> => {
  const response = await fetch(`${API_URL}/spaces/${encodeURIComponent(spaceId)}/articles/delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ article_ids: articleIds }),
  });
  if (!response.ok) throw new Error(await readError(response));
  return response.json();
}

export const fetchFailedArticles = async (spaceId: string): Promise<FailedArticle[]> => {
  const response = await fetch(`${API_URL}/spaces/${encodeURIComponent(spaceId)}/articles/failed`);
  if (!response.ok) throw new Error(await readError(response));
  return response.json();
}

export const retryArticles = async (spaceId: string, articleIds?: string[]): Promise<JobSubmitResponse> => {
  const response = await fetch(`${API_URL}/spaces/${encodeURIComponent(spaceId)}/articles/retry`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ article_ids: articleIds ?? null }),
  });
  if (!response.ok) throw new Error(await readError(response));
  return response.json();
}
