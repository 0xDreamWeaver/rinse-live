import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Item, ProgressUpdate, User } from '../types';

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

      // Progress updates
      progressUpdates: new Map(),
      setProgressUpdate: (update) =>
        set((state) => {
          const newUpdates = new Map(state.progressUpdates);
          newUpdates.set(update.item_id, update);
          return { progressUpdates: newUpdates };
        }),

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
