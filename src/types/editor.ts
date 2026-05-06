export type EditorHistoryStatus = 'queued' | 'processing' | 'completed' | 'failed';

export interface EditorHistoryItem {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  html_snapshot?: string | null;
  status: EditorHistoryStatus;
  error_message?: string | null;
  created_at: string;
  parent_id?: number | null;
}

export interface EditorChatResponse {
  success: boolean;
  message: string;
  history_id: number;
  status: 'queued';
}

export interface EditorHistoryResponse {
  success: boolean;
  data: EditorHistoryItem[];
}

export interface EditorRollbackResponse {
  success: boolean;
  message: string;
  html: string;
}
