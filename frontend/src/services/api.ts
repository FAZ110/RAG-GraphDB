import type { BulkExtractRequest, ExpansionResponse, JobSubmitResponse, SeedResponse, SimilarNode } from '../types';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000';

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
