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
