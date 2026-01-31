import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Item, ProgressUpdate, User, WsEvent, ActiveDownload } from '../types';

interface AppStore {
  // Auth state
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setAuth: (token: string, user: User) => void;
  clearAuth: () => void;
  setLoading: (loading: boolean) => void;

  // Download progress tracking
  progressUpdates: Map<number, ProgressUpdate>;
  setProgressUpdate: (update: ProgressUpdate) => void;

  // Active downloads/searches (for real-time UI)
  // Keyed by trackingId (client-generated unique ID)
  activeDownloads: Map<string, ActiveDownload>;
  addPendingSearch: (query: string, queueId?: number) => string; // Returns trackingId
  handleWsEvent: (event: WsEvent) => void;
  clearActiveDownload: (trackingId: string) => void;
  dismissActiveDownload: (trackingId: string) => void; // User-initiated dismiss

  // Items that need refresh (triggered by WebSocket)
  itemsNeedRefresh: boolean;
  setItemsNeedRefresh: (value: boolean) => void;

  // Selected items for batch operations
  selectedItemIds: number[];
  toggleItemSelection: (id: number) => void;
  clearItemSelection: () => void;

  // Selected lists for batch operations
  selectedListIds: number[];
  toggleListSelection: (id: number) => void;
  clearListSelection: () => void;

  // Search suggestions (cached already downloaded items)
  searchSuggestions: Item[];
  setSearchSuggestions: (items: Item[]) => void;
}

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      // Auth state
      token: null,
      user: null,
      isAuthenticated: false,
      isLoading: true,
      setAuth: (token, user) =>
        set({
          token,
          user,
          isAuthenticated: true,
          isLoading: false,
        }),
      clearAuth: () =>
        set({
          token: null,
          user: null,
          isAuthenticated: false,
          isLoading: false,
        }),
      setLoading: (loading) => set({ isLoading: loading }),

      // Progress updates (legacy)
      progressUpdates: new Map(),
      setProgressUpdate: (update) =>
        set((state) => {
          const newUpdates = new Map(state.progressUpdates);
          newUpdates.set(update.item_id, update);
          return { progressUpdates: newUpdates };
        }),

      // Active downloads (new real-time tracking)
      // Keyed by trackingId (client-generated unique ID)
      activeDownloads: new Map(),

      // Create a pending search entry when user initiates a search
      addPendingSearch: (query, queueId) => {
        const trackingId = `search-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        set((state) => {
          const downloads = new Map(state.activeDownloads);
          downloads.set(trackingId, {
            trackingId,
            itemId: 0,
            query,
            stage: 'searching',
            queueId,
            createdAt: Date.now(),
          });
          return { activeDownloads: downloads };
        });
        return trackingId;
      },

      handleWsEvent: (event) =>
        set((state) => {
          const downloads = new Map(state.activeDownloads);
          let needsRefresh = state.itemsNeedRefresh;

          // Helper to find a download by query (searches entries that haven't completed)
          const findByQuery = (query: string, stages?: string[]): [string, ActiveDownload] | undefined => {
            for (const [key, download] of downloads.entries()) {
              if (download.query === query) {
                if (!stages || stages.includes(download.stage)) {
                  return [key, download];
                }
              }
            }
            return undefined;
          };

          // Helper to find a download by itemId (only if itemId > 0)
          const findByItemId = (itemId: number): [string, ActiveDownload] | undefined => {
            if (itemId <= 0) return undefined;
            for (const [key, download] of downloads.entries()) {
              if (download.itemId === itemId && download.itemId > 0) {
                return [key, download];
              }
            }
            return undefined;
          };

          // Helper to find entry by itemId first, then by query as fallback
          // This handles cases where itemId wasn't set yet when entry was created
          const findEntry = (itemId: number, query?: string, allowedStages?: string[]): [string, ActiveDownload] | undefined => {
            // First try by itemId
            const byId = findByItemId(itemId);
            if (byId) return byId;
            // Fallback to query if provided
            if (query) {
              return findByQuery(query, allowedStages);
            }
            return undefined;
          };

          switch (event.type) {
            case 'search_started': {
              // Try to find existing pending search by query (in searching stage)
              const found = findByQuery(event.query, ['searching']);
              if (found) {
                const [key, existing] = found;
                downloads.set(key, {
                  ...existing,
                  itemId: event.item_id || existing.itemId,
                  stage: 'searching',
                });
              } else {
                // No pending search found - create a new one
                const trackingId = `search-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                downloads.set(trackingId, {
                  trackingId,
                  itemId: event.item_id || 0,
                  query: event.query,
                  stage: 'searching',
                  createdAt: Date.now(),
                });
              }
              break;
            }
            case 'search_progress': {
              // Try itemId first, then query (for entries where itemId wasn't set)
              const found = findEntry(event.item_id || 0, (event as any).query, ['searching']);
              if (found) {
                const [key, existing] = found;
                downloads.set(key, {
                  ...existing,
                  itemId: event.item_id || existing.itemId,
                  resultsCount: event.results_count,
                  usersCount: event.users_count,
                });
              }
              break;
            }
            case 'search_completed': {
              // Try itemId first, then query
              const found = findEntry(event.item_id || 0, undefined, ['searching', 'selecting']);
              if (found) {
                const [key, existing] = found;
                downloads.set(key, {
                  ...existing,
                  itemId: event.item_id || existing.itemId,
                  stage: 'selecting',
                  resultsCount: event.results_count,
                  selectedFile: event.selected_file || undefined,
                  selectedUser: event.selected_user || undefined,
                });
              }
              break;
            }
            case 'download_started': {
              // Try itemId first, then look for any entry in searching/selecting stage
              let found = findByItemId(event.item_id);
              if (!found) {
                // Look for an entry that's still in searching/selecting stage
                // This handles cases where itemId wasn't propagated from search events
                for (const [key, download] of downloads.entries()) {
                  if (['searching', 'selecting'].includes(download.stage)) {
                    // Check if this could be the right entry (itemId matches or itemId is 0)
                    if (download.itemId === 0 || download.itemId === event.item_id) {
                      found = [key, download];
                      break;
                    }
                  }
                }
              }
              if (found) {
                const [key, existing] = found;
                downloads.set(key, {
                  ...existing,
                  itemId: event.item_id,
                  stage: 'downloading',
                  filename: event.filename,
                  totalBytes: event.total_bytes,
                  bytesDownloaded: 0,
                  progressPct: 0,
                });
              } else {
                // Download started without prior search tracking - create entry
                const trackingId = `download-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                downloads.set(trackingId, {
                  trackingId,
                  itemId: event.item_id,
                  query: '',
                  stage: 'downloading',
                  filename: event.filename,
                  totalBytes: event.total_bytes,
                  bytesDownloaded: 0,
                  progressPct: 0,
                  createdAt: Date.now(),
                });
              }
              needsRefresh = true;
              break;
            }
            case 'download_progress': {
              const found = findByItemId(event.item_id);
              if (found) {
                const [key, existing] = found;
                downloads.set(key, {
                  ...existing,
                  bytesDownloaded: event.bytes_downloaded,
                  totalBytes: event.total_bytes,
                  progressPct: event.progress_pct,
                  speedKbps: event.speed_kbps,
                });
              }
              break;
            }
            case 'download_completed': {
              const found = findByItemId(event.item_id);
              if (found) {
                const [key, existing] = found;
                downloads.set(key, {
                  ...existing,
                  stage: 'completed',
                  filename: event.filename,
                  totalBytes: event.total_bytes,
                  progressPct: 100,
                });
              }
              needsRefresh = true;
              break;
            }
            case 'download_failed': {
              // Try itemId first, then look for any searching/selecting/downloading entry
              let found = findByItemId(event.item_id);
              if (!found) {
                for (const [key, download] of downloads.entries()) {
                  if (['searching', 'selecting', 'downloading'].includes(download.stage)) {
                    if (download.itemId === 0 || download.itemId === event.item_id) {
                      found = [key, download];
                      break;
                    }
                  }
                }
              }
              if (found) {
                const [key, existing] = found;
                downloads.set(key, {
                  ...existing,
                  itemId: event.item_id,
                  stage: 'failed',
                  error: event.error,
                });
              }
              needsRefresh = true;
              break;
            }
            case 'download_queued': {
              let found = findByItemId(event.item_id);
              if (!found) {
                for (const [key, download] of downloads.entries()) {
                  if (['searching', 'selecting', 'downloading'].includes(download.stage)) {
                    if (download.itemId === 0 || download.itemId === event.item_id) {
                      found = [key, download];
                      break;
                    }
                  }
                }
              }
              if (found) {
                const [key, existing] = found;
                downloads.set(key, {
                  ...existing,
                  itemId: event.item_id,
                  stage: 'queued',
                  error: event.reason,
                });
              }
              needsRefresh = true;
              break;
            }
            case 'duplicate_found': {
              // Find by query (any stage since it could still be searching)
              const found = findByQuery(event.query);
              if (found) {
                const [key, existing] = found;
                downloads.set(key, {
                  ...existing,
                  itemId: event.item_id,
                  stage: 'duplicate',
                  filename: event.filename,
                });
              } else {
                // Create new entry for duplicate
                const trackingId = `dup-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                downloads.set(trackingId, {
                  trackingId,
                  itemId: event.item_id,
                  query: event.query,
                  stage: 'duplicate',
                  filename: event.filename,
                  createdAt: Date.now(),
                });
              }
              break;
            }
            case 'item_updated': {
              // Update progress updates for the items table
              const newUpdates = new Map(state.progressUpdates);
              newUpdates.set(event.item_id, {
                item_id: event.item_id,
                filename: event.filename,
                status: event.status,
                progress: event.progress,
              });
              needsRefresh = true;
              return { activeDownloads: downloads, progressUpdates: newUpdates, itemsNeedRefresh: needsRefresh };
            }
          }

          return { activeDownloads: downloads, itemsNeedRefresh: needsRefresh };
        }),
      clearActiveDownload: (trackingId) =>
        set((state) => {
          const downloads = new Map(state.activeDownloads);
          downloads.delete(trackingId);
          return { activeDownloads: downloads };
        }),
      dismissActiveDownload: (trackingId) =>
        set((state) => {
          const downloads = new Map(state.activeDownloads);
          downloads.delete(trackingId);
          return { activeDownloads: downloads };
        }),

      // Items refresh flag
      itemsNeedRefresh: false,
      setItemsNeedRefresh: (value) => set({ itemsNeedRefresh: value }),

      // Item selection
      selectedItemIds: [],
      toggleItemSelection: (id) =>
        set((state) => ({
          selectedItemIds: state.selectedItemIds.includes(id)
            ? state.selectedItemIds.filter((itemId) => itemId !== id)
            : [...state.selectedItemIds, id],
        })),
      clearItemSelection: () => set({ selectedItemIds: [] }),

      // List selection
      selectedListIds: [],
      toggleListSelection: (id) =>
        set((state) => ({
          selectedListIds: state.selectedListIds.includes(id)
            ? state.selectedListIds.filter((listId) => listId !== id)
            : [...state.selectedListIds, id],
        })),
      clearListSelection: () => set({ selectedListIds: [] }),

      // Search suggestions
      searchSuggestions: [],
      setSearchSuggestions: (items) => set({ searchSuggestions: items }),
    }),
    {
      name: 'rinse-auth',
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// Convenience hook for auth state
export const useAuth = () => {
  const { token, user, isAuthenticated, isLoading, setAuth, clearAuth, setLoading } =
    useAppStore();
  return { token, user, isAuthenticated, isLoading, setAuth, clearAuth, setLoading };
};
