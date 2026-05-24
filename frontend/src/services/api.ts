import type { BulkExtractRequest, BulkExtractResponse, GraphResponse } from '../types';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000';

export const extractGraphData = async (data: BulkExtractRequest): Promise<BulkExtractResponse> => {
  const response = await fetch(`${API_URL}/extract`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  const responseData = await response.json().catch(() => ({}));

  if (!response.ok) {
    const backendMessage = responseData.detail?.[0]?.msg || responseData.detail || responseData.error;
    throw new Error(backendMessage || `Server error: ${response.status}`);
  }

  return responseData;
};

export const fetchGraph = async (): Promise<GraphResponse> => {
  const response = await fetch(`${API_URL}/graph`);
  if (!response.ok) throw new Error(`Server error: ${response.status}`);
  return response.json();
}

export const deleteGraph = async (): Promise<void> => {
  const response = await fetch(`${API_URL}/graph`, {
    method: 'DELETE'
  })
  if (!response.ok) throw new Error(`Server error: ${response.status}`);
}
