import type {
  Item, List, ListWithItems, User,
  EnqueueSearchResponse, EnqueueListResponse, QueueStatusResponse, QueueItemsResponse,
  TrackMetadata, MetadataRefreshResponse, MetadataJobResponse, MetadataJobStatusResponse,
  ListTrackRequest,
  MusicService, OAuthConnectionStatus, OAuthConnectResponse, OAuthCallbackResponse, PlaylistsResponse
} from '../types';
import { useAppStore } from '../store';

// Use relative URLs by default (Vite proxy handles /api requests in dev)
// Set VITE_API_URL for production or when not using the proxy
const API_BASE = import.meta.env.VITE_API_URL || '';

interface LoginResponse {
  token: string;
  user: User;
}

interface MessageResponse {
  message: string;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private getAuthHeaders(): HeadersInit {
    const token = useAppStore.getState().token;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  private async request<T>(
    endpoint: string,
    options?: RequestInit,
    skipAuth: boolean = false
  ): Promise<T> {
    const headers = skipAuth
      ? { 'Content-Type': 'application/json', ...options?.headers }
      : { ...this.getAuthHeaders(), ...options?.headers };

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      // Token expired or invalid - clear auth state
      useAppStore.getState().clearAuth();
      throw new Error('Session expired. Please log in again.');
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || 'Request failed');
    }

    // Handle empty responses
    const text = await response.text();
    if (!text) {
      return {} as T;
    }

    return JSON.parse(text);
  }

  // Auth endpoints (public - no auth required)
  async login(identifier: string, password: string): Promise<LoginResponse> {
    return this.request(
      '/api/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({ identifier, password }),
      },
      true
    );
  }

  async register(
    username: string,
    email: string,
    password: string
  ): Promise<MessageResponse> {
    return this.request(
      '/api/auth/register',
      {
        method: 'POST',
        body: JSON.stringify({ username, email, password }),
      },
      true
    );
  }

  async verifyEmail(token: string): Promise<MessageResponse> {
    return this.request(
      '/api/auth/verify-email',
      {
        method: 'POST',
        body: JSON.stringify({ token }),
      },
      true
    );
  }

  async resendVerification(email: string): Promise<MessageResponse> {
    return this.request(
      '/api/auth/resend-verification',
      {
        method: 'POST',
        body: JSON.stringify({ email }),
      },
      true
    );
  }

  // Auth endpoints (protected - auth required)
  async getCurrentUser(): Promise<User> {
    return this.request('/api/auth/me');
  }

  // Items
  async getItems(): Promise<Item[]> {
    return this.request('/api/items');
  }

  async getItem(id: number): Promise<Item> {
    return this.request(`/api/items/${id}`);
  }

  // LEGACY: Commented out - use queueSearch() instead
  // async searchItem(query: string, format?: string): Promise<Item> {
  //   return this.request('/api/items/search', {
  //     method: 'POST',
  //     body: JSON.stringify({ query, format }),
  //   });
  // }

  async deleteItem(id: number): Promise<void> {
    return this.request(`/api/items/${id}`, {
      method: 'DELETE',
    });
  }

  async batchDeleteItems(ids: number[]): Promise<void> {
    return this.request('/api/items', {
      method: 'DELETE',
      body: JSON.stringify({ ids }),
    });
  }

  getItemDownloadUrl(id: number): string {
    const token = useAppStore.getState().token;
    const url = `${this.baseUrl}/api/items/${id}/download`;
    return token ? `${url}?token=${token}` : url;
  }

  getItemStreamUrl(id: number): string {
    // Same as download URL - the backend now serves with inline disposition for playback
    const token = useAppStore.getState().token;
    const url = `${this.baseUrl}/api/items/${id}/download`;
    return token ? `${url}?token=${token}` : url;
  }

  // Lists
  async getLists(): Promise<List[]> {
    return this.request('/api/lists');
  }

  async getList(id: number): Promise<ListWithItems> {
    return this.request(`/api/lists/${id}`);
  }

  // LEGACY: Commented out - use queueList() instead
  // async searchList(queries: string[], name?: string, format?: string): Promise<List> {
  //   return this.request('/api/lists/search', {
  //     method: 'POST',
  //     body: JSON.stringify({ queries, name, format }),
  //   });
  // }

  async deleteList(id: number): Promise<void> {
    return this.request(`/api/lists/${id}`, {
      method: 'DELETE',
    });
  }

  async deleteListWithItems(id: number): Promise<void> {
    return this.request(`/api/lists/${id}/with-items`, {
      method: 'DELETE',
    });
  }

  async renameList(id: number, name: string): Promise<void> {
    return this.request(`/api/lists/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ name }),
    });
  }

  async batchDeleteLists(ids: number[]): Promise<void> {
    return this.request('/api/lists', {
      method: 'DELETE',
      body: JSON.stringify({ ids }),
    });
  }

  async removeItemFromList(listId: number, itemId: number): Promise<void> {
    return this.request(`/api/lists/${listId}/items/${itemId}`, {
      method: 'DELETE',
    });
  }

  async batchRemoveItemsFromList(listId: number, itemIds: number[]): Promise<void> {
    return this.request(`/api/lists/${listId}/items`, {
      method: 'DELETE',
      body: JSON.stringify({ item_ids: itemIds }),
    });
  }

  getListDownloadUrl(id: number): string {
    const token = useAppStore.getState().token;
    const url = `${this.baseUrl}/api/lists/${id}/download`;
    return token ? `${url}?token=${token}` : url;
  }

  // Queue API (new non-blocking search system)
  async queueSearch(track: string, artist?: string, format?: string, clientId?: string): Promise<EnqueueSearchResponse> {
    // Generate client_id if not provided
    const client_id = clientId || `search-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    return this.request('/api/queue/search', {
      method: 'POST',
      body: JSON.stringify({ track, artist, format, client_id }),
    });
  }

  async queueList(tracks: ListTrackRequest[], name?: string, format?: string): Promise<EnqueueListResponse> {
    return this.request('/api/queue/list', {
      method: 'POST',
      body: JSON.stringify({ tracks, name, format }),
    });
  }

  async getQueueStatus(): Promise<QueueStatusResponse> {
    return this.request('/api/queue');
  }

  async getQueueItems(): Promise<QueueItemsResponse> {
    return this.request('/api/queue/items');
  }

  async cancelQueuedSearch(queueId: number): Promise<{ cancelled: boolean; message: string }> {
    return this.request(`/api/queue/${queueId}`, {
      method: 'DELETE',
    });
  }

  async getSearchHistory(limit: number = 50, offset: number = 0): Promise<import('../types').SearchHistoryResponse> {
    return this.request(`/api/queue/history?limit=${limit}&offset=${offset}`);
  }

  // WebSocket
  getWebSocketUrl(): string {
    const token = useAppStore.getState().token;

    // If using relative URLs (proxy mode), construct WebSocket URL from current location
    if (!this.baseUrl) {
      const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
      const wsUrl = `${wsProtocol}://${window.location.host}/api/ws/progress`;
      return token ? `${wsUrl}?token=${token}` : wsUrl;
    }

    // Otherwise use the configured base URL
    const wsProtocol = this.baseUrl.startsWith('https') ? 'wss' : 'ws';
    const url = this.baseUrl.replace(/^https?/, wsProtocol);
    return token ? `${url}/api/ws/progress?token=${token}` : `${url}/api/ws/progress`;
  }

  // Metadata
  async getItemMetadata(id: number): Promise<TrackMetadata> {
    return this.request(`/api/items/${id}/metadata`);
  }

  async refreshItemMetadata(id: number): Promise<MetadataRefreshResponse> {
    return this.request(`/api/items/${id}/metadata/refresh`, {
      method: 'POST',
    });
  }

  async clearItemMetadata(id: number): Promise<{ item_id: number; message: string }> {
    return this.request(`/api/items/${id}/metadata`, {
      method: 'DELETE',
    });
  }

  async batchRefreshMetadata(ids: number[]): Promise<{ results: Array<{ id: number; success: boolean; error?: string }> }> {
    // The backend doesn't have a batch endpoint, so we call single refresh for each
    // We run them in parallel but with a small delay to avoid overwhelming the server
    const results: Array<{ id: number; success: boolean; error?: string }> = [];

    // Process in batches of 5 to avoid too many concurrent requests
    const batchSize = 5;
    for (let i = 0; i < ids.length; i += batchSize) {
      const batch = ids.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(async (id) => {
          try {
            await this.refreshItemMetadata(id);
            return { id, success: true };
          } catch (error) {
            return {
              id,
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error'
            };
          }
        })
      );
      results.push(...batchResults);

      // Small delay between batches to be nice to the server
      if (i + batchSize < ids.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    return { results };
  }

  async startMetadataJob(): Promise<MetadataJobResponse> {
    return this.request('/api/metadata/job', {
      method: 'POST',
    });
  }

  async getMetadataJobStatus(): Promise<MetadataJobStatusResponse> {
    return this.request('/api/metadata/job');
  }

  // OAuth - External Service Connections
  async getOAuthConnections(): Promise<OAuthConnectionStatus[]> {
    return this.request('/api/oauth/connections');
  }

  async getOAuthConnectionStatus(service: MusicService): Promise<OAuthConnectionStatus> {
    return this.request(`/api/oauth/${service}/status`);
  }

  async startOAuthConnect(service: MusicService): Promise<OAuthConnectResponse> {
    return this.request(`/api/oauth/${service}/connect`);
  }

  async completeOAuthCallback(service: MusicService, code: string, state: string): Promise<OAuthCallbackResponse> {
    return this.request(`/api/oauth/${service}/callback`, {
      method: 'POST',
      body: JSON.stringify({ code, state }),
    });
  }

  async disconnectOAuth(service: MusicService): Promise<void> {
    return this.request(`/api/oauth/${service}/disconnect`, {
      method: 'DELETE',
    });
  }

  async getServicePlaylists(service: MusicService, limit: number = 50, offset: number = 0): Promise<PlaylistsResponse> {
    return this.request(`/api/oauth/${service}/playlists?limit=${limit}&offset=${offset}`);
  }
}

export const api = new ApiClient(API_BASE);
