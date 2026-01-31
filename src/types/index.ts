export interface Item {
  id: number;
  filename: string;
  original_query: string;
  file_path: string;
  file_size: number;
  bitrate: number | null;
  duration: number | null;
  extension: string;
  source_username: string;
  download_status: 'pending' | 'downloading' | 'completed' | 'failed';
  download_progress: number;
  error_message: string | null;
  metadata: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface List {
  id: number;
  name: string;
  user_id: number;
  status: 'pending' | 'downloading' | 'completed' | 'partial' | 'failed';
  total_items: number;
  completed_items: number;
  failed_items: number;
  created_at: string;
  completed_at: string | null;
}

export interface ListWithItems {
  list: List;
  items: Item[];
}

export interface User {
  id: number;
  username: string;
  email: string;
  email_verified: boolean;
  created_at: string;
}

export interface ProgressUpdate {
  item_id: number;
  filename: string;
  status: string;
  progress: number;
}

// WebSocket event types from backend
export type WsEventType =
  | 'search_started'
  | 'search_progress'
  | 'search_completed'
  | 'download_started'
  | 'download_progress'
  | 'download_completed'
  | 'download_failed'
  | 'download_queued'
  | 'item_updated'
  | 'duplicate_found';

export interface WsSearchStarted {
  type: 'search_started';
  item_id: number;
  query: string;
}

export interface WsSearchProgress {
  type: 'search_progress';
  item_id: number;
  results_count: number;
  users_count: number;
}

export interface WsSearchCompleted {
  type: 'search_completed';
  item_id: number;
  results_count: number;
  selected_file: string | null;
  selected_user: string | null;
}

export interface WsDownloadStarted {
  type: 'download_started';
  item_id: number;
  filename: string;
  total_bytes: number;
}

export interface WsDownloadProgress {
  type: 'download_progress';
  item_id: number;
  bytes_downloaded: number;
  total_bytes: number;
  progress_pct: number;
  speed_kbps: number;
}

export interface WsDownloadCompleted {
  type: 'download_completed';
  item_id: number;
  filename: string;
  total_bytes: number;
}

export interface WsDownloadFailed {
  type: 'download_failed';
  item_id: number;
  error: string;
}

export interface WsDownloadQueued {
  type: 'download_queued';
  item_id: number;
  position: number | null;
  reason: string;
}

export interface WsItemUpdated {
  type: 'item_updated';
  item_id: number;
  filename: string;
  status: string;
  progress: number;
}

export interface WsDuplicateFound {
  type: 'duplicate_found';
  item_id: number;
  filename: string;
  query: string;
}

export type WsEvent =
  | WsSearchStarted
  | WsSearchProgress
  | WsSearchCompleted
  | WsDownloadStarted
  | WsDownloadProgress
  | WsDownloadCompleted
  | WsDownloadFailed
  | WsDownloadQueued
  | WsItemUpdated
  | WsDuplicateFound;

// Current download/search state for UI
export interface ActiveDownload {
  itemId: number;
  query: string;
  stage: 'searching' | 'selecting' | 'downloading' | 'completed' | 'failed' | 'queued' | 'duplicate';
  filename?: string;
  resultsCount?: number;
  usersCount?: number;
  selectedFile?: string;
  selectedUser?: string;
  bytesDownloaded?: number;
  totalBytes?: number;
  progressPct?: number;
  speedKbps?: number;
  error?: string;
}
