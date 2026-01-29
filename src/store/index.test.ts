import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from './index';

describe('AppStore', () => {
  beforeEach(() => {
    // Reset store before each test
    useAppStore.setState({
      progressUpdates: new Map(),
      selectedItemIds: [],
      selectedListIds: [],
      searchSuggestions: [],
    });
  });

  describe('Progress Updates', () => {
    it('should set progress update', () => {
      const update = {
        item_id: 1,
        filename: 'test.mp3',
        status: 'downloading',
        progress: 0.5,
      };

      useAppStore.getState().setProgressUpdate(update);

      const updates = useAppStore.getState().progressUpdates;
      expect(updates.has(1)).toBe(true);
      expect(updates.get(1)).toEqual(update);
    });

    it('should update existing progress', () => {
      const update1 = {
        item_id: 1,
        filename: 'test.mp3',
        status: 'downloading',
        progress: 0.3,
      };

      const update2 = {
        item_id: 1,
        filename: 'test.mp3',
        status: 'downloading',
        progress: 0.8,
      };

      useAppStore.getState().setProgressUpdate(update1);
      useAppStore.getState().setProgressUpdate(update2);

      const updates = useAppStore.getState().progressUpdates;
      expect(updates.get(1)?.progress).toBe(0.8);
    });
  });

  describe('Item Selection', () => {
    it('should toggle item selection', () => {
      useAppStore.getState().toggleItemSelection(1);
      expect(useAppStore.getState().selectedItemIds).toContain(1);

      useAppStore.getState().toggleItemSelection(1);
      expect(useAppStore.getState().selectedItemIds).not.toContain(1);
    });

    it('should select multiple items', () => {
      useAppStore.getState().toggleItemSelection(1);
      useAppStore.getState().toggleItemSelection(2);
      useAppStore.getState().toggleItemSelection(3);

      const selected = useAppStore.getState().selectedItemIds;
      expect(selected).toHaveLength(3);
      expect(selected).toContain(1);
      expect(selected).toContain(2);
      expect(selected).toContain(3);
    });

    it('should clear item selection', () => {
      useAppStore.getState().toggleItemSelection(1);
      useAppStore.getState().toggleItemSelection(2);
      useAppStore.getState().clearItemSelection();

      expect(useAppStore.getState().selectedItemIds).toHaveLength(0);
    });
  });

  describe('List Selection', () => {
    it('should toggle list selection', () => {
      useAppStore.getState().toggleListSelection(1);
      expect(useAppStore.getState().selectedListIds).toContain(1);

      useAppStore.getState().toggleListSelection(1);
      expect(useAppStore.getState().selectedListIds).not.toContain(1);
    });

    it('should clear list selection', () => {
      useAppStore.getState().toggleListSelection(1);
      useAppStore.getState().toggleListSelection(2);
      useAppStore.getState().clearListSelection();

      expect(useAppStore.getState().selectedListIds).toHaveLength(0);
    });
  });

  describe('Search Suggestions', () => {
    it('should set search suggestions', () => {
      const items: any[] = [
        { id: 1, filename: 'song1.mp3' },
        { id: 2, filename: 'song2.mp3' },
      ];

      useAppStore.getState().setSearchSuggestions(items);

      const suggestions = useAppStore.getState().searchSuggestions;
      expect(suggestions).toHaveLength(2);
      expect(suggestions[0].filename).toBe('song1.mp3');
    });
  });
});
