import { EditorHistoryResponse, EditorChatResponse, EditorRollbackResponse } from '@/types/editor';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://sonhosfuncionando.com.br/api/v1';

const authHeaders = (token: string) => ({
  'Authorization': `Bearer ${token}`,
  'Accept': 'application/json',
});

export const fetchEditorHistory = async (
  token: string,
  siteId: number
): Promise<EditorHistoryResponse> => {
  const response = await fetch(`${API_BASE_URL}/workspace/sites/${siteId}/editor/history`, {
    method: 'GET',
    headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
  });
  if (!response.ok) throw new Error('Failed to fetch editor history');
  return response.json();
};

export const sendEditorChat = async (
  token: string,
  siteId: number,
  prompt: string,
  images?: File[],
  scrapedImages?: string[]
): Promise<EditorChatResponse> => {
  const formData = new FormData();
  formData.append('prompt', prompt);
  
  if (images) {
    images.forEach((file) => formData.append('images[]', file));
  }
  
  if (scrapedImages) {
    scrapedImages.forEach((url) => formData.append('scraped_images[]', url));
  }

  const response = await fetch(`${API_BASE_URL}/workspace/sites/${siteId}/editor/chat`, {
    method: 'POST',
    headers: authHeaders(token),
    body: formData,
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to send editor chat');
  }
  return response.json();
};

export const rollbackEditor = async (
  token: string,
  siteId: number,
  historyId: number
): Promise<EditorRollbackResponse> => {
  const response = await fetch(`${API_BASE_URL}/workspace/sites/${siteId}/editor/rollback/${historyId}`, {
    method: 'POST',
    headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
  });
  if (!response.ok) throw new Error('Failed to rollback');
  return response.json();
};
