import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Item, ProgressUpdate, User, WsEvent, ActiveDownload } from '../types';
import { api } from '../lib/api';

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
  // Keyed by client_id (client-generated unique ID passed to backend)
  activeDownloads: Map<string, ActiveDownload>;
  addPendingSearch: (query: string, clientId: string) => void; // clientId must be pre-generated
  generateClientId: () => string; // Generate a new client_id
  handleWsEvent: (event: WsEvent) => void;
  clearActiveDownload: (clientId: string) => void;
  dismissActiveDownload: (clientId: string) => void; // User-initiated dismiss

  // Items that need refresh (triggered by WebSocket)
  itemsNeedRefresh: boolean;
  setItemsNeedRefresh: (value: boolean) => void;

  // Lists that need refresh (triggered by WebSocket)
  listsNeedRefresh: boolean;
  setListsNeedRefresh: (value: boolean) => void;

  // Selected items for batch operations
  selectedItemIds: number[];
  toggleItemSelection: (id: number) => void;
  clearItemSelection: () => void;

  // Selected lists for batch operations
  selectedListIds: number[];
  toggleListSelection: (id: number) => void;
  clearListSelection: () => void;

  // Selected items within a list for batch operations
  selectedListItemIds: number[];
  toggleListItemSelection: (id: number) => void;
  clearListItemSelection: () => void;
  setSelectedListItemIds: (ids: number[]) => void;

  // Search suggestions (cached already downloaded items)
  searchSuggestions: Item[];
  setSearchSuggestions: (items: Item[]) => void;

  // Audio player state
  currentTrack: Item | null;
  isPlaying: boolean;
  playTrack: (track: Item) => void;
  pausePlayback: () => void;
  resumePlayback: () => void;
  stopPlayback: () => void;
  togglePlayPause: () => void;
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
      // Keyed by client_id (client-generated unique ID passed to backend)
      activeDownloads: new Map(),

      // Generate a unique client_id for a new search
      generateClientId: () => {
        return `search-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      },

      // Create a pending search entry when user initiates a search
      // clientId must be pre-generated and will be passed to the backend
      addPendingSearch: (query, clientId) => {
        console.log('[Popup] addPendingSearch:', { query, clientId });
        set((state) => {
          const downloads = new Map(state.activeDownloads);
          downloads.set(clientId, {
            trackingId: clientId,
            itemId: 0,
            query,
            stage: 'searching',
            createdAt: Date.now(),
          });
          return { activeDownloads: downloads };
        });
      },

      handleWsEvent: (event) =>
        set((state) => {
          const downloads = new Map(state.activeDownloads);
          let needsRefresh = state.itemsNeedRefresh;

          // Log incoming WebSocket event
          const eventClientId = 'client_id' in event ? (event as { client_id?: string }).client_id : undefined;
          const eventItemId = 'item_id' in event ? (event as { item_id?: number }).item_id : undefined;
          const eventQuery = 'query' in event ? (event as { query?: string }).query : undefined;
          console.log('[Popup] WS Event received:', {
            type: event.type,
            client_id: eventClientId,
            item_id: eventItemId,
            query: eventQuery,
            activeDownloadsKeys: Array.from(downloads.keys()),
          });

          // Helper to find a download by client_id (the reliable way)
          const findByClientId = (clientId: string | undefined): [string, ActiveDownload] | undefined => {
            if (!clientId) return undefined;
            const download = downloads.get(clientId);
            if (download) {
              console.log('[Popup] findByClientId found:', { clientId, download });
              return [clientId, download];
            }
            return undefined;
          };

          // Helper to find a download by query (fallback for legacy events without client_id)
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

          // Helper to find entry - tries client_id first, then itemId, then query
          // client_id is the most reliable, itemId is reliable once set, query is fallback
          const findEntry = (clientId: string | undefined, itemId: number, query?: string, allowedStages?: string[]): [string, ActiveDownload] | undefined => {
            // First try by client_id (most reliable)
            const byClientId = findByClientId(clientId);
            if (byClientId) {
              console.log('[Popup] findEntry matched by client_id:', { clientId });
              return byClientId;
            }
            // Then try by itemId
            const byId = findByItemId(itemId);
            if (byId) {
              console.log('[Popup] findEntry matched by itemId:', { itemId });
              return byId;
            }
            // Fallback to query if provided
            if (query) {
              const byQuery = findByQuery(query, allowedStages);
              if (byQuery) {
                console.log('[Popup] findEntry matched by query:', { query, allowedStages });
                return byQuery;
              }
            }
            console.log('[Popup] findEntry NO MATCH:', { clientId, itemId, query, allowedStages });
            return undefined;
          };

          switch (event.type) {
            case 'search_started': {
              // Try to find existing entry by client_id first, then query
              // Use broader stage filter to find ANY existing entry for this search
              const found = findEntry(event.client_id, event.item_id || 0, event.query, undefined);
              if (found) {
                const [key, existing] = found;
                // Don't overwrite more advanced stages - search_started is an early event
                // If we already have duplicate/completed/failed, don't regress to searching
                const advancedStages = ['duplicate', 'completed', 'failed', 'downloading'];
                if (advancedStages.includes(existing.stage)) {
                  console.log('[Popup] search_started: SKIPPING - entry already in advanced stage', { key, currentStage: existing.stage });
                  break;
                }
                console.log('[Popup] search_started: updating existing entry', { key, client_id: event.client_id });
                downloads.set(key, {
                  ...existing,
                  itemId: event.item_id || existing.itemId,
                  stage: 'searching',
                });
              } else if (event.client_id) {
                // Create new entry keyed by client_id
                console.log('[Popup] search_started: creating new entry with client_id', { client_id: event.client_id });
                downloads.set(event.client_id, {
                  trackingId: event.client_id,
                  itemId: event.item_id || 0,
                  query: event.query,
                  stage: 'searching',
                  createdAt: Date.now(),
                });
              } else {
                // No client_id - try to find by query with no stage restriction
                const byQuery = findByQuery(event.query, undefined);
                if (byQuery) {
                  // Found existing entry by query - don't create duplicate
                  const [key, existing] = byQuery;
                  if (!['duplicate', 'completed', 'failed', 'downloading'].includes(existing.stage)) {
                    console.log('[Popup] search_started: updating existing entry by query', { key });
                    downloads.set(key, {
                      ...existing,
                      itemId: event.item_id || existing.itemId,
                      stage: 'searching',
                    });
                  } else {
                    console.log('[Popup] search_started: SKIPPING - found entry by query in advanced stage', { key, currentStage: existing.stage });
                  }
                } else {
                  // No client_id and no existing entry - create new with generated id
                  const trackingId = `search-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                  console.log('[Popup] search_started: creating new entry with generated id (no client_id!)', { trackingId });
                  downloads.set(trackingId, {
                    trackingId,
                    itemId: event.item_id || 0,
                    query: event.query,
                    stage: 'searching',
                    createdAt: Date.now(),
                  });
                }
              }
              break;
            }
            case 'search_progress': {
              // Try client_id first, then itemId, then query
              const found = findEntry(event.client_id, event.item_id || 0, undefined, ['searching']);
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
              // Try client_id first, then itemId
              const found = findEntry(event.client_id, event.item_id || 0, undefined, ['searching', 'selecting']);
              if (found) {
                const [key, existing] = found;
                console.log('[Popup] search_completed: updating entry to selecting', { key, client_id: event.client_id, item_id: event.item_id });
                downloads.set(key, {
                  ...existing,
                  itemId: event.item_id || existing.itemId,
                  stage: 'selecting',
                  resultsCount: event.results_count,
                  selectedFile: event.selected_file || undefined,
                  selectedUser: event.selected_user || undefined,
                });
              } else {
                console.log('[Popup] search_completed: NO ENTRY FOUND!', { client_id: event.client_id, item_id: event.item_id });
              }
              break;
            }
            case 'download_started': {
              // Try client_id first, then itemId, then look for any searching/selecting entry
              let found = findEntry(event.client_id, event.item_id, undefined, ['searching', 'selecting']);
              if (!found && !event.client_id) {
                // Look for an entry that's still in searching/selecting stage (legacy fallback)
                for (const [key, download] of downloads.entries()) {
                  if (['searching', 'selecting'].includes(download.stage)) {
                    if (download.itemId === 0 || download.itemId === event.item_id) {
                      found = [key, download];
                      console.log('[Popup] download_started: found via legacy fallback', { key });
                      break;
                    }
                  }
                }
              }
              if (found) {
                const [key, existing] = found;
                console.log('[Popup] download_started: updating entry to downloading', { key, client_id: event.client_id, item_id: event.item_id });
                downloads.set(key, {
                  ...existing,
                  itemId: event.item_id,
                  stage: 'downloading',
                  filename: event.filename,
                  totalBytes: event.total_bytes,
                  bytesDownloaded: 0,
                  progressPct: 0,
                });
              } else if (event.client_id) {
                console.log('[Popup] download_started: creating NEW entry (no existing match!) with client_id', { client_id: event.client_id });
                // Create new entry keyed by client_id
                downloads.set(event.client_id, {
                  trackingId: event.client_id,
                  itemId: event.item_id,
                  query: '',
                  stage: 'downloading',
                  filename: event.filename,
                  totalBytes: event.total_bytes,
                  bytesDownloaded: 0,
                  progressPct: 0,
                  createdAt: Date.now(),
                });
              } else {
                // Download started without prior search tracking - create entry with generated id
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
              // Try client_id first, then itemId
              const found = findEntry(event.client_id, event.item_id, undefined, undefined);
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
              // Try client_id first, then itemId
              const found = findEntry(event.client_id, event.item_id, undefined, undefined);
              if (found) {
                const [key, existing] = found;
                console.log('[Popup] download_completed: updating entry to completed', { key, client_id: event.client_id, item_id: event.item_id });
                downloads.set(key, {
                  ...existing,
                  stage: 'completed',
                  filename: event.filename,
                  totalBytes: event.total_bytes,
                  progressPct: 100,
                });
              } else {
                console.log('[Popup] download_completed: NO ENTRY FOUND to update!', { client_id: event.client_id, item_id: event.item_id });
              }
              needsRefresh = true;
              break;
            }
            case 'download_failed': {
              // Try client_id first, then itemId, then search for active entries
              let found = findEntry(event.client_id, event.item_id, undefined, ['searching', 'selecting', 'downloading']);
              if (!found && !event.client_id) {
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
              // Try client_id first, then itemId
              let found = findEntry(event.client_id, event.item_id, undefined, ['searching', 'selecting', 'downloading']);
              if (!found && !event.client_id) {
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
              // Try client_id first, then query
              const found = findEntry(event.client_id, event.item_id, event.query, undefined);
              if (found) {
                const [key, existing] = found;
                console.log('[Popup] duplicate_found: updating existing entry', { key, client_id: event.client_id, previousStage: existing.stage });
                downloads.set(key, {
                  ...existing,
                  itemId: event.item_id,
                  stage: 'duplicate',
                  filename: event.filename,
                });
              } else if (event.client_id) {
                // Create new entry keyed by client_id
                console.log('[Popup] duplicate_found: creating NEW entry (no existing match!) with client_id', { client_id: event.client_id });
                downloads.set(event.client_id, {
                  trackingId: event.client_id,
                  itemId: event.item_id,
                  query: event.query,
                  stage: 'duplicate',
                  filename: event.filename,
                  createdAt: Date.now(),
                });
              } else {
                // Create new entry for duplicate with generated id
                const trackingId = `dup-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                console.log('[Popup] duplicate_found: creating NEW entry (no client_id!) with generated id', { trackingId });
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
            case 'list_created': {
              // A new list was created - refresh lists
              return { activeDownloads: downloads, itemsNeedRefresh: needsRefresh, listsNeedRefresh: true };
            }
            case 'list_progress': {
              // List progress updated - refresh lists
              return { activeDownloads: downloads, itemsNeedRefresh: needsRefresh, listsNeedRefresh: true };
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

      // Lists refresh flag
      listsNeedRefresh: false,
      setListsNeedRefresh: (value) => set({ listsNeedRefresh: value }),

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

      // List item selection (items within a specific list)
      selectedListItemIds: [],
      toggleListItemSelection: (id) =>
        set((state) => ({
          selectedListItemIds: state.selectedListItemIds.includes(id)
            ? state.selectedListItemIds.filter((itemId) => itemId !== id)
            : [...state.selectedListItemIds, id],
        })),
      clearListItemSelection: () => set({ selectedListItemIds: [] }),
      setSelectedListItemIds: (ids) => set({ selectedListItemIds: ids }),

      // Search suggestions
      searchSuggestions: [],
      setSearchSuggestions: (items) => set({ searchSuggestions: items }),

      // Audio player state
      currentTrack: null,
      isPlaying: false,
      playTrack: (track) => set({ currentTrack: track, isPlaying: true }),
      pausePlayback: () => set({ isPlaying: false }),
      resumePlayback: () => set({ isPlaying: true }),
      stopPlayback: () => set({ currentTrack: null, isPlaying: false }),
      togglePlayPause: () => set((state) => ({ isPlaying: !state.isPlaying })),
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

// Convenience hook for audio player state
export const useAudioPlayer = () => {
  const {
    currentTrack,
    isPlaying,
    playTrack,
    pausePlayback,
    resumePlayback,
    stopPlayback,
    togglePlayPause,
  } = useAppStore();
  return {
    currentTrack,
    isPlaying,
    playTrack,
    pausePlayback,
    resumePlayback,
    stopPlayback,
    togglePlayPause,
    getStreamUrl: (itemId: number) => api.getItemStreamUrl(itemId),
  };
};
