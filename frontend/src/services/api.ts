import type { BulkExtractRequest, CustomProvider, CustomProviderInput, DuplicateSuggestion, ExpansionResponse, OverviewResponse, ExtractionSettings, JobSubmitResponse, SeedResponse, SimilarNode, Space, SpaceStats, Article, ArticleDetail, ArticlesDeleted, Batch, SearchResults, NodeSource, LoadedNode, LoadedEdge, NodeFields } from '../types';

export const API_URL = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000';

export const readError = async (response: Response): Promise<string> => {
  const body: unknown = await response.json().catch(() => null);
  const detail = (body as { detail?: unknown } | null)?.detail;
  if (typeof detail === 'string') return detail;
  // FastAPI's validation errors come as a list.
  const first = Array.isArray(detail) ? (detail[0] as { msg?: unknown } | undefined)?.msg : undefined;
  return typeof first === 'string' ? first : `Server error: ${response.status}`;
}

export const spaceUrl = (spaceId: string) => `${API_URL}/spaces/${encodeURIComponent(spaceId)}`;

export const submitExtract = async (
  spaceId: string,
  data: BulkExtractRequest,
): Promise<JobSubmitResponse> => {
  const response = await fetch(`${spaceUrl(spaceId)}/articles`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  const responseData = await response.json().catch(() => ({}));
  if (!response.ok) {
    const backendMessage = responseData.detail?.[0]?.msg || responseData.detail || responseData.error;
    throw new Error(backendMessage || `Server error: ${response.status}`);
  }
  return responseData as JobSubmitResponse;
}

// The graph is built from the space's articles, so it can only be cleared together with them.
export const clearSpace = async (spaceId: string): Promise<void> => {
  const response = await fetch(`${spaceUrl(spaceId)}/articles`, { method: 'DELETE' });
  if (!response.ok) throw new Error(await readError(response));
}

export const fetchSimilarNodes = async (
  spaceId: string,
  q: string,
  topK = 10,
): Promise<SimilarNode[]> => {
  const response = await fetch(
    `${spaceUrl(spaceId)}/graph/search?q=${encodeURIComponent(q)}&top_k=${topK}`
  );
  if (!response.ok) throw new Error(await readError(response));
  return response.json();
}

export const fetchGraphSeed = async (spaceId: string, limit = 25): Promise<SeedResponse> => {
  const response = await fetch(`${spaceUrl(spaceId)}/graph?limit=${limit}`);
  if (!response.ok) throw new Error(await readError(response));
  return response.json();
}

export const fetchNode = (spaceId: string, nodeId: string) =>
  sendJson<LoadedNode>(`${spaceUrl(spaceId)}/graph/nodes/${encodeURIComponent(nodeId)}`, 'GET');

export const fetchNeighbours = (spaceId: string, nodeId: string, limit: number) =>
  sendJson<ExpansionResponse>(`${spaceUrl(spaceId)}/graph/nodes/${encodeURIComponent(nodeId)}/neighbours?limit=${limit}`, 'GET');

export const fetchGraphOverview = (spaceId: string) =>
  sendJson<OverviewResponse>(`${spaceUrl(spaceId)}/graph/overview`, 'GET');

export const fetchNodeSources = async (spaceId: string, nodeId: string): Promise<NodeSource[]> => {
  const response = await fetch(`${spaceUrl(spaceId)}/graph/nodes/${encodeURIComponent(nodeId)}/sources`);
  if (!response.ok) throw new Error(await readError(response));
  return response.json();
}

export const fetchEdgeSources = async (spaceId: string, edgeId: string): Promise<NodeSource[]> => {
  const response = await fetch(`${spaceUrl(spaceId)}/graph/edges/${encodeURIComponent(edgeId)}/sources`);
  if (!response.ok) throw new Error(await readError(response));
  return response.json();
}

const sendJson = async <T>(url: string, method: string, body?: unknown): Promise<T> => {
  const response = await fetch(url, {
    method,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) throw new Error(await readError(response));
  return response.status === 204 ? (undefined as T) : response.json();
}

const graphUrl = (spaceId: string, path: string) => `${spaceUrl(spaceId)}/graph/${path}`;

export const createNode = (spaceId: string, fields: NodeFields) =>
  sendJson<LoadedNode>(graphUrl(spaceId, 'nodes'), 'POST', fields);

/** Existing nodes the one about to be created would likely duplicate. */
export const findExistingLike = (spaceId: string, fields: NodeFields) =>
  sendJson<SimilarNode[]>(graphUrl(spaceId, 'nodes/similar'), 'POST', fields);

export const updateNode = (spaceId: string, nodeId: string, fields: Partial<NodeFields>) =>
  sendJson<LoadedNode>(graphUrl(spaceId, `nodes/${encodeURIComponent(nodeId)}`), 'PATCH', fields);

export const deleteNode = (spaceId: string, nodeId: string) =>
  sendJson<void>(graphUrl(spaceId, `nodes/${encodeURIComponent(nodeId)}`), 'DELETE');

/** Folds `mergeId` into `keepId`; returns the kept node with its neighbours. */
export const mergeNodes = (spaceId: string, keepId: string, mergeId: string) =>
  sendJson<ExpansionResponse>(graphUrl(spaceId, 'nodes/merge'), 'POST', {
    keep_id: keepId,
    merge_id: mergeId,
  });

export const fetchDuplicates = (spaceId: string) =>
  sendJson<DuplicateSuggestion[]>(graphUrl(spaceId, 'duplicates'), 'GET');

export const rejectDuplicate = (spaceId: string, suggestionId: string) =>
  sendJson<void>(graphUrl(spaceId, `duplicates/${encodeURIComponent(suggestionId)}/reject`), 'POST');

export const createEdge = (spaceId: string, sourceId: string, targetId: string, type: string) =>
  sendJson<LoadedEdge>(graphUrl(spaceId, 'edges'), 'POST', {
    source_id: sourceId,
    target_id: targetId,
    type,
  });

/** A relationship's type can't change in place, so the edge comes back with a new id. */
export const updateEdge = (spaceId: string, edgeId: string, type: string) =>
  sendJson<LoadedEdge>(graphUrl(spaceId, `edges/${encodeURIComponent(edgeId)}`), 'PATCH', { type });

export const deleteEdge = (spaceId: string, edgeId: string) =>
  sendJson<void>(graphUrl(spaceId, `edges/${encodeURIComponent(edgeId)}`), 'DELETE');

export const fetchSpaces = async (): Promise<Space[]> => {
  const response = await fetch(`${API_URL}/spaces`);
  if (!response.ok) throw new Error(await readError(response));
  return response.json();
}

const customProvidersUrl = `${API_URL}/settings/providers`;
const customProviderUrl = (id: string) => `${customProvidersUrl}/${encodeURIComponent(id)}`;

export const fetchCustomProviders = () => sendJson<CustomProvider[]>(customProvidersUrl, 'GET');

export const createCustomProvider = (provider: CustomProviderInput) =>
  sendJson<CustomProvider>(customProvidersUrl, 'POST', provider);

export const updateCustomProvider = (id: string, provider: CustomProviderInput) =>
  sendJson<CustomProvider>(customProviderUrl(id), 'PUT', provider);

export const deleteCustomProvider = (id: string) => sendJson<void>(customProviderUrl(id), 'DELETE');

export const fetchExtractionSettings = (spaceId: string) =>
  sendJson<ExtractionSettings>(`${spaceUrl(spaceId)}/extraction-settings`, 'GET');

export const saveExtractionSettings = (
  spaceId: string,
  settings: { rules: string | null; labels: string[] | null }
) => sendJson<ExtractionSettings>(`${spaceUrl(spaceId)}/extraction-settings`, 'PUT', settings);

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

export const retryArticles = async (spaceId: string, articleIds: string[]): Promise<JobSubmitResponse> => {
  const response = await fetch(`${spaceUrl(spaceId)}/articles/retry`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ article_ids: articleIds }),
  });
  if (!response.ok) throw new Error(await readError(response));
  return response.json();
}

export const fetchLatestBatch = async (spaceId: string): Promise<Batch | null> => {
  const response = await fetch(`${spaceUrl(spaceId)}/batches/latest`);
  if (!response.ok) throw new Error(await readError(response));
  return response.json();
}

export const fetchRunningBatches = async (): Promise<Batch[]> => {
  const response = await fetch(`${API_URL}/batches/running`);
  if (!response.ok) throw new Error(await readError(response));
  return response.json();
}

// The upload's id is also its extraction job's, whose events the server streams.
export const openBatchEvents = (batchId: string): EventSource =>
  new EventSource(`${API_URL}/jobs/${encodeURIComponent(batchId)}/events`);

export const searchEverywhere = async (q: string): Promise<SearchResults> => {
  const response = await fetch(`${API_URL}/search?q=${encodeURIComponent(q)}`);
  if (!response.ok) throw new Error(await readError(response));
  return response.json();
}
