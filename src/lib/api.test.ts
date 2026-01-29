import { describe, it, expect, beforeEach, vi } from 'vitest';
import { api } from './api';

describe('API Client', () => {
  beforeEach(() => {
    // Reset fetch mock
    global.fetch = vi.fn();
  });

  describe('getItemDownloadUrl', () => {
    it('should return correct download URL', () => {
      const url = api.getItemDownloadUrl(123);
      expect(url).toContain('/api/items/123/download');
    });
  });

  describe('getListDownloadUrl', () => {
    it('should return correct download URL', () => {
      const url = api.getListDownloadUrl(456);
      expect(url).toContain('/api/lists/456/download');
    });
  });

  describe('getWebSocketUrl', () => {
    it('should return WebSocket URL with ws protocol', () => {
      const url = api.getWebSocketUrl();
      expect(url).toContain('ws://');
      expect(url).toContain('/api/ws/progress');
    });
  });
});
