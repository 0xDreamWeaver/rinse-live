import type { Item, List, ListWithItems, User } from '../types';
import { useAppStore } from '../store';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

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

  async searchItem(query: string, format?: string): Promise<Item> {
    return this.request('/api/items/search', {
      method: 'POST',
      body: JSON.stringify({ query, format }),
    });
  }

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

  // Lists
  async getLists(): Promise<List[]> {
    return this.request('/api/lists');
  }

  async getList(id: number): Promise<ListWithItems> {
    return this.request(`/api/lists/${id}`);
  }

  async searchList(queries: string[], name?: string, format?: string): Promise<List> {
    return this.request('/api/lists/search', {
      method: 'POST',
      body: JSON.stringify({ queries, name, format }),
    });
  }

  async deleteList(id: number): Promise<void> {
    return this.request(`/api/lists/${id}`, {
      method: 'DELETE',
    });
  }

  async batchDeleteLists(ids: number[]): Promise<void> {
    return this.request('/api/lists', {
      method: 'DELETE',
      body: JSON.stringify({ ids }),
    });
  }

  getListDownloadUrl(id: number): string {
    const token = useAppStore.getState().token;
    const url = `${this.baseUrl}/api/lists/${id}/download`;
    return token ? `${url}?token=${token}` : url;
  }

  // WebSocket
  getWebSocketUrl(): string {
    const wsProtocol = this.baseUrl.startsWith('https') ? 'wss' : 'ws';
    const url = this.baseUrl.replace(/^https?/, wsProtocol);
    const token = useAppStore.getState().token;
    return token ? `${url}/api/ws/progress?token=${token}` : `${url}/api/ws/progress`;
  }
}

export const api = new ApiClient(API_BASE);
