export interface Item {
  id: number;
  filename: string;
  original_query: string;
  original_artist: string | null;  // Separate artist from search input
  original_track: string | null;   // Separate track from search input
  file_path: string;
  file_size: number;
  bitrate: number | null;
  duration: number | null;
  extension: string;
  source_username: string;
  download_status: 'pending' | 'downloading' | 'completed' | 'failed' | 'queued' | 'deleted';
  download_progress: number;
  error_message: string | null;
  metadata: string | null;
  created_at: string;
  completed_at: string | null;

  // Track metadata from external API lookups
  meta_artist: string | null;
  meta_album: string | null;
  meta_title: string | null;
  meta_bpm: number | null;
  meta_key: string | null;
  meta_duration_ms: number | null;
  meta_genre: string | null;
  meta_year: number | null;
  meta_track_number: number | null;
  meta_label: string | null;
  meta_album_art_url: string | null;
  meta_musicbrainz_id: string | null;
  metadata_fetched_at: string | null;
  metadata_sources: string | null; // JSON array
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

// Note: Backend uses #[serde(flatten)] so list fields are at root level
export interface ListWithItems extends List {
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
  | 'duplicate_found'
  | 'list_created'
  | 'list_progress'
  | 'search_queued'
  | 'search_processing'
  | 'search_failed';

export interface WsSearchStarted {
  type: 'search_started';
  item_id: number;
  query: string;
  client_id?: string;
}

export interface WsSearchProgress {
  type: 'search_progress';
  item_id: number;
  results_count: number;
  users_count: number;
  client_id?: string;
}

export interface WsSearchCompleted {
  type: 'search_completed';
  item_id: number;
  results_count: number;
  selected_file: string | null;
  selected_user: string | null;
  client_id?: string;
}

export interface WsDownloadStarted {
  type: 'download_started';
  item_id: number;
  filename: string;
  total_bytes: number;
  client_id?: string;
}

export interface WsDownloadProgress {
  type: 'download_progress';
  item_id: number;
  bytes_downloaded: number;
  total_bytes: number;
  progress_pct: number;
  speed_kbps: number;
  client_id?: string;
}

export interface WsDownloadCompleted {
  type: 'download_completed';
  item_id: number;
  filename: string;
  total_bytes: number;
  client_id?: string;
}

export interface WsDownloadFailed {
  type: 'download_failed';
  item_id: number;
  error: string;
  client_id?: string;
}

export interface WsDownloadQueued {
  type: 'download_queued';
  item_id: number;
  position: number | null;
  reason: string;
  client_id?: string;
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
  client_id?: string;
}

export interface WsListCreated {
  type: 'list_created';
  list_id: number;
  name: string;
  total_items: number;
}

export interface WsListProgress {
  type: 'list_progress';
  list_id: number;
  completed: number;
  failed: number;
  total: number;
  status: string;
}

// Queue-related WebSocket events
export interface WsSearchQueued {
  type: 'search_queued';
  queue_id: number;
  query: string;
  position: number;
  client_id?: string;
}

export interface WsSearchProcessing {
  type: 'search_processing';
  queue_id: number;
  query: string;
  client_id?: string;
}

export interface WsSearchFailed {
  type: 'search_failed';
  queue_id: number;
  query: string;
  error: string;
  client_id?: string;
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
  | WsDuplicateFound
  | WsListCreated
  | WsListProgress
  | WsSearchQueued
  | WsSearchProcessing
  | WsSearchFailed;

// Current download/search state for UI
export interface ActiveDownload {
  trackingId: string; // Unique client-side ID for tracking (primary key)
  itemId: number; // Backend item ID (0 until item is created)
  query: string;
  stage: 'searching' | 'processing' | 'selecting' | 'downloading' | 'completed' | 'failed' | 'queued' | 'duplicate';
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
  queueId?: number; // Queue ID from enqueue response
  createdAt: number; // Timestamp for sorting
}

// Queue API request/response types
export interface ListTrackRequest {
  track: string;
  artist?: string;
}

export interface EnqueueSearchResponse {
  queue_id: number;
  track: string;
  artist?: string;
  query: string;  // Combined query used for search
  position: number;
  client_id?: string;
}

export interface EnqueueListResponse {
  list_id: number;
  list_name: string;
  queue_ids: number[];
  total_queued: number;
}

export interface QueueStatusResponse {
  pending: number;
  processing: number;
  active_downloads: number;
  user_pending: number;
  user_processing: number;
}

export interface QueuedSearch {
  id: number;
  user_id: number;
  list_id: number | null;
  item_id: number | null;
  query: string;
  format: string | null;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error_message: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

export interface QueueItemsResponse {
  items: QueuedSearch[];
  pending: number;
  processing: number;
}

// Track metadata from MusicBrainz, GetSongBPM, etc.
export interface TrackMetadata {
  artist: string | null;
  album: string | null;
  title: string | null;
  bpm: number | null;
  key: string | null;
  duration_ms: number | null;
  album_art_url: string | null;
  genre: string | null;
  year: number | null;
  track_number: number | null;
  label: string | null;
  musicbrainz_id: string | null;
  sources: string[];
  fetched_at: string | null;
}

export interface MetadataRefreshResponse {
  item_id: number;
  metadata: TrackMetadata;
  message: string;
}

export interface MetadataJobResponse {
  message: string;
  total_items: number;
}

export interface MetadataJobStatusResponse {
  running: boolean;
  items_without_metadata: number;
}

// Search history entry with username
export interface SearchHistoryEntry {
  id: number;
  user_id: number;
  username: string;
  query: string;
  original_artist: string | null;
  original_track: string | null;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface SearchHistoryResponse {
  entries: SearchHistoryEntry[];
  total: number;
  limit: number;
  offset: number;
}

// OAuth types for external service connections
export type MusicService = 'spotify' | 'tidal' | 'soundcloud' | 'beatport';

export interface OAuthConnectionStatus {
  service: string;
  connected: boolean;
  username: string | null;
  connected_at: string | null;
  last_used_at: string | null;
}

export interface OAuthConnectResponse {
  auth_url: string;
  state: string;
}

export interface OAuthCallbackRequest {
  code: string;
  state: string;
}

export interface OAuthCallbackResponse {
  connected: boolean;
  service: string;
  username: string;
}

export interface ExternalPlaylist {
  id: string;
  name: string;
  description: string | null;
  owner_name: string;
  track_count: number;
  image_url: string | null;
  external_url: string;
  is_public: boolean;
}

export interface ExternalTrack {
  id: string;
  name: string;
  artists: string[];
  album: string | null;
  duration_ms: number | null;
  external_url: string;
}

export interface PlaylistsResponse {
  playlists: ExternalPlaylist[];
  total: number;
  limit: number;
  offset: number;
}
