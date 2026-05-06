import type { ExtractRequest, ExtractResponse } from '../types';

const API_URL = 'http://127.0.0.1:8000';

export const extractGraphData = async (data: ExtractRequest): Promise<ExtractResponse> => {
  const response = await fetch(`${API_URL}/extract`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  const responseData = await response.json().catch(() => ({}));

  if (!response.ok) {
    const backendMessage = responseData.detail?.[0]?.msg || responseData.error;
    throw new Error(backendMessage || `Błąd serwera: ${response.status}`);
  }

  if (responseData.error) {
    throw new Error(responseData.error);
  }

  return responseData;
};