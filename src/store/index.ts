import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';
import type { Item, ProgressUpdate, User, WsEvent, ActiveDownload } from '../types';
import { api } from '../lib/api';

// Auto-cleanup timeout for completed downloads (30 seconds)
const AUTO_CLEANUP_DELAY_MS = 30000;
// Track cleanup timeouts to cancel them if user dismisses manually
const cleanupTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

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
  cleanupProgressUpdate: (itemId: number) => void;

  // Active downloads/searches (for real-time UI)
  // Keyed by client_id (client-generated unique ID passed to backend)
  activeDownloads: Map<string, ActiveDownload>;
  addPendingSearch: (query: string, clientId: string) => void; // clientId must be pre-generated
  generateClientId: () => string; // Generate a new client_id
  handleWsEvent: (event: WsEvent) => void;
  clearActiveDownload: (clientId: string) => void;
  dismissActiveDownload: (clientId: string) => void; // User-initiated dismiss
  scheduleAutoCleanup: (clientId: string) => void; // Schedule auto-cleanup for terminal states

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
  playbackQueue: Item[];
  playbackHistory: Item[];
  shuffleMode: boolean;
  loopMode: 'off' | 'one' | 'all';
  queueIndex: number; // Current position in the queue
  // Frequency data for visualizations (0-1 normalized)
  frequencyData: { low: number; mid: number; high: number };
  setFrequencyData: (data: { low: number; mid: number; high: number }) => void;
  playTrack: (track: Item) => void;
  playTrackFromQueue: (items: Item[], startIndex: number) => void;
  pausePlayback: () => void;
  resumePlayback: () => void;
  stopPlayback: () => void;
  togglePlayPause: () => void;
  playNext: () => void;
  playPrevious: () => void;
  toggleShuffle: () => void;
  cycleLoopMode: () => void;
  hasNext: () => boolean;
  hasPrevious: () => boolean;
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
      cleanupProgressUpdate: (itemId) =>
        set((state) => {
          const newUpdates = new Map(state.progressUpdates);
          newUpdates.delete(itemId);
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
          let clientIdToAutoCleanup: string | null = null;
          let itemIdToCleanupProgress: number | null = null;

          // Extract common event properties
          const eventClientId = 'client_id' in event ? (event as { client_id?: string }).client_id : undefined;
          const eventItemId = 'item_id' in event ? (event as { item_id?: number }).item_id : undefined;

          // Helper to find a download by client_id (the reliable way)
          const findByClientId = (clientId: string | undefined): [string, ActiveDownload] | undefined => {
            if (!clientId) return undefined;
            const download = downloads.get(clientId);
            if (download) {
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
              return byClientId;
            }
            // Then try by itemId
            const byId = findByItemId(itemId);
            if (byId) {
              return byId;
            }
            // Fallback to query if provided
            if (query) {
              const byQuery = findByQuery(query, allowedStages);
              if (byQuery) {
                return byQuery;
              }
            }
            return undefined;
          };

          switch (event.type) {
            case 'search_started': {
              // Try to find existing entry by client_id first, then query
              const found = findEntry(event.client_id, event.item_id || 0, event.query, undefined);
              if (found) {
                const [key, existing] = found;
                // Don't overwrite more advanced stages - search_started is an early event
                const advancedStages = ['duplicate', 'completed', 'failed', 'downloading'];
                if (advancedStages.includes(existing.stage)) {
                  break;
                }
                downloads.set(key, {
                  ...existing,
                  itemId: event.item_id || existing.itemId,
                  stage: 'searching',
                });
              } else if (event.client_id) {
                // Create new entry keyed by client_id
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
                  const [key, existing] = byQuery;
                  if (!['duplicate', 'completed', 'failed', 'downloading'].includes(existing.stage)) {
                    downloads.set(key, {
                      ...existing,
                      itemId: event.item_id || existing.itemId,
                      stage: 'searching',
                    });
                  }
                } else {
                  // No client_id and no existing entry - create new with generated id
                  const trackingId = `search-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
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
            case 'search_processing': {
              // Search moved from queue to active processing
              const found = findEntry(event.client_id, 0, event.query, ['searching', 'queued']);
              if (found) {
                const [key, existing] = found;
                downloads.set(key, {
                  ...existing,
                  stage: 'processing',
                  queueId: event.queue_id,
                });
              } else if (event.client_id) {
                // Create new entry if we don't have one
                downloads.set(event.client_id, {
                  trackingId: event.client_id,
                  itemId: 0,
                  query: event.query,
                  stage: 'processing',
                  queueId: event.queue_id,
                  createdAt: Date.now(),
                });
              }
              break;
            }
            case 'search_progress': {
              // Try client_id first, then itemId, then query
              const found = findEntry(event.client_id, event.item_id || 0, undefined, ['searching', 'processing']);
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
              const found = findEntry(event.client_id, event.item_id || 0, undefined, ['searching', 'processing', 'selecting']);
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
            case 'search_failed': {
              // Search failed (no results or error)
              const found = findEntry(event.client_id, 0, event.query, ['searching', 'processing', 'selecting']);
              if (found) {
                const [key, existing] = found;
                // Simplify error message for display
                let simplifiedError = event.error;
                if (event.error.includes('No results found')) {
                  simplifiedError = 'No results found';
                } else if (event.error.includes('No suitable files')) {
                  simplifiedError = 'No matching files';
                } else if (event.error.includes('Not connected')) {
                  simplifiedError = 'Not connected';
                } else if (event.error.length > 50) {
                  simplifiedError = event.error.substring(0, 47) + '...';
                }
                downloads.set(key, {
                  ...existing,
                  stage: 'failed',
                  error: simplifiedError,
                });
                // Schedule auto-cleanup for failed searches
                clientIdToAutoCleanup = key;
              }
              break;
            }
            case 'download_started': {
              // Try client_id first, then itemId, then look for any searching/processing/selecting entry
              let found = findEntry(event.client_id, event.item_id, undefined, ['searching', 'processing', 'selecting']);
              if (!found && !event.client_id) {
                // Look for an entry that's still in an early stage (legacy fallback)
                for (const [key, download] of downloads.entries()) {
                  if (['searching', 'processing', 'selecting'].includes(download.stage)) {
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
              } else if (event.client_id) {
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
                downloads.set(key, {
                  ...existing,
                  stage: 'completed',
                  filename: event.filename,
                  totalBytes: event.total_bytes,
                  progressPct: 100,
                });
                // Schedule auto-cleanup for completed downloads
                clientIdToAutoCleanup = key;
                // Clean up progress tracking for this item
                itemIdToCleanupProgress = event.item_id;
              }
              needsRefresh = true;
              break;
            }
            case 'download_failed': {
              // Try client_id first, then itemId, then search for active entries
              let found = findEntry(event.client_id, event.item_id, undefined, ['searching', 'processing', 'selecting', 'downloading']);
              if (!found && !event.client_id) {
                for (const [key, download] of downloads.entries()) {
                  if (['searching', 'processing', 'selecting', 'downloading'].includes(download.stage)) {
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
                // Schedule auto-cleanup for failed downloads
                clientIdToAutoCleanup = key;
                // Clean up progress tracking for this item
                itemIdToCleanupProgress = event.item_id;
              }
              needsRefresh = true;
              break;
            }
            case 'download_queued': {
              // Try client_id first, then itemId
              let found = findEntry(event.client_id, event.item_id, undefined, ['searching', 'processing', 'selecting', 'downloading']);
              if (!found && !event.client_id) {
                for (const [key, download] of downloads.entries()) {
                  if (['searching', 'processing', 'selecting', 'downloading'].includes(download.stage)) {
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
              let keyToCleanup: string | null = null;
              if (found) {
                const [key, existing] = found;
                downloads.set(key, {
                  ...existing,
                  itemId: event.item_id,
                  stage: 'duplicate',
                  filename: event.filename,
                });
                keyToCleanup = key;
              } else if (event.client_id) {
                // Create new entry keyed by client_id
                downloads.set(event.client_id, {
                  trackingId: event.client_id,
                  itemId: event.item_id,
                  query: event.query,
                  stage: 'duplicate',
                  filename: event.filename,
                  createdAt: Date.now(),
                });
                keyToCleanup = event.client_id;
              } else {
                // Create new entry for duplicate with generated id
                const trackingId = `dup-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                downloads.set(trackingId, {
                  trackingId,
                  itemId: event.item_id,
                  query: event.query,
                  stage: 'duplicate',
                  filename: event.filename,
                  createdAt: Date.now(),
                });
                keyToCleanup = trackingId;
              }
              // Schedule auto-cleanup for duplicate entries
              if (keyToCleanup) {
                clientIdToAutoCleanup = keyToCleanup;
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

          // Schedule auto-cleanup and progress cleanup after state update
          if (clientIdToAutoCleanup) {
            const idToCleanup = clientIdToAutoCleanup;
            setTimeout(() => {
              useAppStore.getState().scheduleAutoCleanup(idToCleanup);
            }, 0);
          }
          if (itemIdToCleanupProgress) {
            const itemId = itemIdToCleanupProgress;
            setTimeout(() => {
              useAppStore.getState().cleanupProgressUpdate(itemId);
            }, 0);
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
          // Cancel any pending auto-cleanup timeout
          const existingTimeout = cleanupTimeouts.get(trackingId);
          if (existingTimeout) {
            clearTimeout(existingTimeout);
            cleanupTimeouts.delete(trackingId);
          }
          const downloads = new Map(state.activeDownloads);
          downloads.delete(trackingId);
          return { activeDownloads: downloads };
        }),
      scheduleAutoCleanup: (clientId) => {
        // Cancel any existing timeout for this clientId
        const existingTimeout = cleanupTimeouts.get(clientId);
        if (existingTimeout) {
          clearTimeout(existingTimeout);
        }
        // Schedule cleanup after delay
        const timeout = setTimeout(() => {
          cleanupTimeouts.delete(clientId);
          useAppStore.getState().clearActiveDownload(clientId);
        }, AUTO_CLEANUP_DELAY_MS);
        cleanupTimeouts.set(clientId, timeout);
      },

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
      playbackQueue: [],
      playbackHistory: [],
      shuffleMode: false,
      loopMode: 'off',
      queueIndex: -1,
      frequencyData: { low: 0, mid: 0, high: 0 },

      setFrequencyData: (data) => set({ frequencyData: data }),

      playTrack: (track) => set((state) => {
        // When playing a single track, clear the queue context
        return {
          currentTrack: track,
          isPlaying: true,
          playbackQueue: [track],
          queueIndex: 0,
          // Don't clear history - user might want to go back
        };
      }),

      playTrackFromQueue: (items, startIndex) => set((state) => {
        const track = items[startIndex];
        if (!track) return state;

        // If shuffle is on, we still maintain the original queue order
        // but playNext/playPrevious will pick randomly
        return {
          currentTrack: track,
          isPlaying: true,
          playbackQueue: items,
          queueIndex: startIndex,
          playbackHistory: state.currentTrack
            ? [...state.playbackHistory, state.currentTrack].slice(-50) // Keep last 50 tracks
            : state.playbackHistory,
        };
      }),

      pausePlayback: () => set({ isPlaying: false }),
      resumePlayback: () => set({ isPlaying: true }),

      stopPlayback: () => set({
        currentTrack: null,
        isPlaying: false,
        playbackQueue: [],
        queueIndex: -1,
      }),

      togglePlayPause: () => set((state) => ({ isPlaying: !state.isPlaying })),

      playNext: () => set((state) => {
        const { playbackQueue, queueIndex, shuffleMode, loopMode, currentTrack } = state;

        if (playbackQueue.length === 0) return state;

        // Add current track to history
        const newHistory = currentTrack
          ? [...state.playbackHistory, currentTrack].slice(-50)
          : state.playbackHistory;

        let nextIndex: number;

        if (shuffleMode) {
          // Pick a random track that's not the current one
          if (playbackQueue.length === 1) {
            nextIndex = 0;
          } else {
            do {
              nextIndex = Math.floor(Math.random() * playbackQueue.length);
            } while (nextIndex === queueIndex && playbackQueue.length > 1);
          }
        } else {
          nextIndex = queueIndex + 1;
        }

        // Handle end of queue
        if (nextIndex >= playbackQueue.length) {
          if (loopMode === 'all') {
            nextIndex = 0;
          } else {
            // End of queue, stop playing
            return {
              ...state,
              isPlaying: false,
              playbackHistory: newHistory,
            };
          }
        }

        return {
          currentTrack: playbackQueue[nextIndex],
          isPlaying: true,
          queueIndex: nextIndex,
          playbackHistory: newHistory,
        };
      }),

      playPrevious: () => set((state) => {
        const { playbackQueue, queueIndex, playbackHistory } = state;

        // If we have history, go back to the last played track
        if (playbackHistory.length > 0) {
          const previousTrack = playbackHistory[playbackHistory.length - 1];
          const newHistory = playbackHistory.slice(0, -1);

          // Find the track in the current queue if possible
          const indexInQueue = playbackQueue.findIndex(t => t.id === previousTrack.id);

          return {
            currentTrack: previousTrack,
            isPlaying: true,
            queueIndex: indexInQueue >= 0 ? indexInQueue : state.queueIndex,
            playbackHistory: newHistory,
          };
        }

        // No history - go to previous track in queue
        if (playbackQueue.length === 0) return state;

        let prevIndex = queueIndex - 1;
        if (prevIndex < 0) {
          prevIndex = playbackQueue.length - 1; // Wrap around
        }

        return {
          currentTrack: playbackQueue[prevIndex],
          isPlaying: true,
          queueIndex: prevIndex,
        };
      }),

      toggleShuffle: () => set((state) => ({ shuffleMode: !state.shuffleMode })),

      cycleLoopMode: () => set((state) => {
        const modes: Array<'off' | 'one' | 'all'> = ['off', 'one', 'all'];
        const currentIndex = modes.indexOf(state.loopMode);
        const nextIndex = (currentIndex + 1) % modes.length;
        return { loopMode: modes[nextIndex] };
      }),

      hasNext: () => {
        const state = useAppStore.getState();
        const { playbackQueue, queueIndex, loopMode, shuffleMode } = state;
        if (playbackQueue.length === 0) return false;
        if (loopMode === 'all' || shuffleMode) return true;
        return queueIndex < playbackQueue.length - 1;
      },

      hasPrevious: () => {
        const state = useAppStore.getState();
        return state.playbackHistory.length > 0 || state.queueIndex > 0;
      },
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
// Uses useShallow to prevent re-renders when unrelated store properties change
// NOTE: frequencyData is NOT included here - use useFrequencyData for that
// This prevents 60fps re-renders in components that don't need frequency visualization
export const useAudioPlayer = () => {
  const state = useAppStore(
    useShallow((s) => ({
      currentTrack: s.currentTrack,
      isPlaying: s.isPlaying,
      playbackQueue: s.playbackQueue,
      playbackHistory: s.playbackHistory,
      shuffleMode: s.shuffleMode,
      loopMode: s.loopMode,
      queueIndex: s.queueIndex,
      playTrack: s.playTrack,
      playTrackFromQueue: s.playTrackFromQueue,
      pausePlayback: s.pausePlayback,
      resumePlayback: s.resumePlayback,
      stopPlayback: s.stopPlayback,
      togglePlayPause: s.togglePlayPause,
      playNext: s.playNext,
      playPrevious: s.playPrevious,
      toggleShuffle: s.toggleShuffle,
      cycleLoopMode: s.cycleLoopMode,
      hasNext: s.hasNext,
      hasPrevious: s.hasPrevious,
    }))
  );
  return {
    ...state,
    getStreamUrl: (itemId: number) => api.getItemStreamUrl(itemId),
  };
};

// Targeted hook for frequency data - only re-renders when these specific values change
// Used by PlayingIndicator and AudioPlayer for frequency visualization
export const useFrequencyData = () => {
  return useAppStore(
    useShallow((state) => ({
      frequencyData: state.frequencyData,
      isPlaying: state.isPlaying,
      setFrequencyData: state.setFrequencyData,
    }))
  );
};
