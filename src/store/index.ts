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
  activeDownloads: Map<number, ActiveDownload>;
  handleWsEvent: (event: WsEvent) => void;
  clearActiveDownload: (itemId: number) => void;

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
      activeDownloads: new Map(),
      handleWsEvent: (event) =>
        set((state) => {
          const downloads = new Map(state.activeDownloads);
          let needsRefresh = state.itemsNeedRefresh;

          switch (event.type) {
            case 'search_started': {
              // Clear any previous finished downloads so the new search is visible
              for (const [key, download] of downloads.entries()) {
                if (['completed', 'failed', 'duplicate'].includes(download.stage)) {
                  downloads.delete(key);
                }
              }
              downloads.set(event.item_id || 0, {
                itemId: event.item_id || 0,
                query: event.query,
                stage: 'searching',
              });
              break;
            }
            case 'search_progress': {
              const existing = downloads.get(event.item_id || 0);
              if (existing) {
                downloads.set(event.item_id || 0, {
                  ...existing,
                  resultsCount: event.results_count,
                  usersCount: event.users_count,
                });
              }
              break;
            }
            case 'search_completed': {
              const existing = downloads.get(event.item_id || 0);
              if (existing) {
                downloads.set(event.item_id || 0, {
                  ...existing,
                  stage: 'selecting',
                  resultsCount: event.results_count,
                  selectedFile: event.selected_file || undefined,
                  selectedUser: event.selected_user || undefined,
                });
              }
              break;
            }
            case 'download_started': {
              const existing = downloads.get(event.item_id);
              downloads.set(event.item_id, {
                ...(existing || { itemId: event.item_id, query: '' }),
                stage: 'downloading',
                filename: event.filename,
                totalBytes: event.total_bytes,
                bytesDownloaded: 0,
                progressPct: 0,
              });
              needsRefresh = true;
              break;
            }
            case 'download_progress': {
              const existing = downloads.get(event.item_id);
              if (existing) {
                downloads.set(event.item_id, {
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
              const existing = downloads.get(event.item_id);
              if (existing) {
                downloads.set(event.item_id, {
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
              const existing = downloads.get(event.item_id);
              if (existing) {
                downloads.set(event.item_id, {
                  ...existing,
                  stage: 'failed',
                  error: event.error,
                });
              }
              needsRefresh = true;
              break;
            }
            case 'download_queued': {
              const existing = downloads.get(event.item_id);
              if (existing) {
                downloads.set(event.item_id, {
                  ...existing,
                  stage: 'queued',
                  error: event.reason,
                });
              }
              needsRefresh = true;
              break;
            }
            case 'duplicate_found': {
              // Item already exists in library
              downloads.set(event.item_id || 0, {
                itemId: event.item_id,
                query: event.query,
                stage: 'duplicate',
                filename: event.filename,
              });
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
      clearActiveDownload: (itemId) =>
        set((state) => {
          const downloads = new Map(state.activeDownloads);
          downloads.delete(itemId);
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
