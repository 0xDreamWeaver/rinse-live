import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search as SearchIcon,
  Plus,
  Sparkles,
  ChevronDown,
  ChevronUp,
  X,
  Loader2,
  Clock,
  ArrowRight,
  SlidersHorizontal,
} from 'lucide-react';
import { api } from '../lib/api';
import { useAppStore } from '../store';
import { useShallow } from 'zustand/react/shallow';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { PlaylistBrowser } from '../components/import/PlaylistBrowser';
import { PlaylistDetailModal } from '../components/import/PlaylistDetailModal';
import type { MusicService, ExternalPlaylist } from '../types';

// Audio format options
type AudioFormat = 'any' | 'mp3' | 'flac' | 'm4a' | 'wav' | 'aiff' | 'ogg';
const FORMAT_OPTIONS: { id: AudioFormat; label: string }[] = [
  { id: 'any', label: 'Any' },
  { id: 'mp3', label: 'MP3' },
  { id: 'flac', label: 'FLAC' },
  { id: 'm4a', label: 'M4A' },
  { id: 'wav', label: 'WAV' },
  { id: 'aiff', label: 'AIFF' },
  { id: 'ogg', label: 'OGG' },
];

// Track input for list mode
interface ListTrackInput {
  track: string;
  artist: string;
}

export function Import() {
  // Single search inputs
  const [track, setTrack] = useState('');
  const [artist, setArtist] = useState('');
  const [format, setFormat] = useState<AudioFormat>('any');
  const [showFormatDropdown, setShowFormatDropdown] = useState(false);

  // Multi-track mode
  const [showMultiTrack, setShowMultiTrack] = useState(false);
  const [listTracks, setListTracks] = useState<ListTrackInput[]>([{ track: '', artist: '' }]);
  const [listName, setListName] = useState('');

  // Playlist detail modal state
  const [selectedPlaylist, setSelectedPlaylist] = useState<{
    service: MusicService;
    playlist: ExternalPlaylist;
  } | null>(null);
  const [importingPlaylistId, setImportingPlaylistId] = useState<string | null>(null);

  const queryClient = useQueryClient();

  const { addPendingSearch, generateClientId } = useAppStore(
    useShallow((state) => ({
      addPendingSearch: state.addPendingSearch,
      generateClientId: state.generateClientId,
    }))
  );

  // Fetch items for suggestions
  const { data: items } = useQuery({
    queryKey: ['items'],
    queryFn: () => api.getItems(),
  });

  // Fetch OAuth connections
  const { data: connections, isLoading: isLoadingConnections } = useQuery({
    queryKey: ['oauth-connections'],
    queryFn: () => api.getOAuthConnections(),
  });

  // Fetch queue status
  const { data: queueStatus } = useQuery({
    queryKey: ['queue-status'],
    queryFn: () => api.getQueueStatus(),
    refetchInterval: 2000,
  });

  const queueSearchMutation = useMutation({
    mutationFn: async ({ track, artist, format }: { track: string; artist: string; format: AudioFormat }) => {
      const clientId = generateClientId();
      const displayQuery = artist.trim() ? `${artist.trim()} - ${track.trim()}` : track.trim();
      addPendingSearch(displayQuery, clientId);
      return api.queueSearch(
        track.trim(),
        artist.trim() || undefined,
        format === 'any' ? undefined : format,
        clientId
      );
    },
    onSuccess: () => {
      setTrack('');
      setArtist('');
    },
  });

  const queueListMutation = useMutation({
    mutationFn: async (data: { tracks: ListTrackInput[]; name?: string; format?: string }) => {
      data.tracks.forEach(t => {
        const displayQuery = t.artist.trim() ? `${t.artist.trim()} - ${t.track.trim()}` : t.track.trim();
        const clientId = generateClientId();
        addPendingSearch(displayQuery, clientId);
      });
      const apiTracks = data.tracks.map(t => ({
        track: t.track.trim(),
        artist: t.artist.trim() || undefined,
      }));
      return api.queueList(apiTracks, data.name, data.format);
    },
    onSuccess: () => {
      setListTracks([{ track: '', artist: '' }]);
      setListName('');
      setShowMultiTrack(false);
    },
  });

  const handleSearchItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (track.trim()) {
      queueSearchMutation.mutate({ track, artist, format });
    }
  };

  const handleSearchList = (e: React.FormEvent) => {
    e.preventDefault();
    const validTracks = listTracks.filter((t) => t.track.trim());
    if (validTracks.length > 0) {
      queueListMutation.mutate({
        tracks: validTracks,
        name: listName || undefined,
        format: format === 'any' ? undefined : format,
      });
    }
  };

  const addListTrack = () => {
    setListTracks([...listTracks, { track: '', artist: '' }]);
  };

  const updateListTrack = (index: number, field: 'track' | 'artist', value: string) => {
    const newTracks = [...listTracks];
    newTracks[index] = { ...newTracks[index], [field]: value };
    setListTracks(newTracks);
  };

  const removeListTrack = (index: number) => {
    setListTracks(listTracks.filter((_, i) => i !== index));
  };

  const handleViewPlaylist = (service: MusicService, playlist: ExternalPlaylist) => {
    setSelectedPlaylist({ service, playlist });
  };

  const handleImportPlaylist = async (service: MusicService, playlist: ExternalPlaylist) => {
    setImportingPlaylistId(playlist.id);

    try {
      // Fetch all tracks from the playlist
      let allTracks: { track: string; artist: string }[] = [];
      let offset = 0;
      const limit = 100;

      while (true) {
        const data = await api.getPlaylistTracks(service, playlist.id, limit, offset);
        const tracks = data.tracks.map(t => ({
          track: t.name,
          artist: t.artists.join(', '),
        }));
        allTracks = [...allTracks, ...tracks];

        if (allTracks.length >= data.total) break;
        offset += limit;
      }

      // Queue all tracks as a list
      if (allTracks.length > 0) {
        allTracks.forEach(t => {
          const displayQuery = t.artist ? `${t.artist} - ${t.track}` : t.track;
          const clientId = generateClientId();
          addPendingSearch(displayQuery, clientId);
        });

        await api.queueList(
          allTracks.map(t => ({
            track: t.track,
            artist: t.artist || undefined,
          })),
          playlist.name,
          format === 'any' ? undefined : format
        );
      }

      // Invalidate queries to refresh lists
      queryClient.invalidateQueries({ queryKey: ['lists'] });
    } catch (error) {
      console.error('Failed to import playlist:', error);
    } finally {
      setImportingPlaylistId(null);
      setSelectedPlaylist(null);
    }
  };

  // Filter suggestions based on track input
  const searchTerm = track.trim();
  const suggestions =
    items?.filter(
      (item) =>
        item.download_status === 'completed' &&
        searchTerm.length >= 3 &&
        item.filename.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

  const validTrackCount = listTracks.filter((t) => t.track.trim()).length;
  const pendingCount = queueStatus?.pending_count ?? 0;
  const activeCount = queueStatus?.active_count ?? 0;
  const queueTotal = pendingCount + activeCount;

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start justify-between"
      >
        <div className="space-y-1">
          <h1 className="text-4xl font-bold font-display text-terminal-green">
            Import
          </h1>
          <p className="text-sm text-gray-500">
            Add music to your library
          </p>
        </div>

        {/* Queue Indicator */}
        {queueTotal > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-2 px-3 py-2 border rounded border-terminal-green/50 bg-terminal-green/10"
          >
            <Loader2 className="w-4 h-4 text-terminal-green animate-spin" />
            <span className="text-sm font-mono text-terminal-green">
              {activeCount > 0 ? `${activeCount} active` : ''}{activeCount > 0 && pendingCount > 0 ? ', ' : ''}{pendingCount > 0 ? `${pendingCount} queued` : ''}
            </span>
          </motion.div>
        )}
      </motion.div>

      {/* Search Section */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="space-y-4"
      >
        <h2 className="text-lg font-display font-bold text-gray-400">
          Search
        </h2>

        <div className="card-terminal">
          {/* Single Track Form */}
          <form onSubmit={handleSearchItem} className="space-y-4">
            <div className="flex gap-2">
              {/* Artist input */}
              <div className="w-1/4">
                <input
                  type="text"
                  value={artist}
                  onChange={(e) => setArtist(e.target.value)}
                  placeholder="Artist (optional)"
                  className="w-full input-terminal text-sm"
                />
              </div>

              {/* Track input */}
              <div className="flex-1 relative">
                <SearchIcon className="absolute left-3 top-1/2 w-4 h-4 text-gray-500 -translate-y-1/2" />
                <input
                  type="text"
                  value={track}
                  onChange={(e) => setTrack(e.target.value)}
                  placeholder="Track name"
                  className="pl-10 w-full input-terminal text-sm"
                />
              </div>

              {/* Format dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowFormatDropdown(!showFormatDropdown)}
                  className="flex items-center gap-2 px-3 h-full border border-dark-500 bg-dark-700 text-sm font-mono text-gray-400 hover:border-gray-500 transition-colors"
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  <span>{format === 'any' ? 'Format' : format.toUpperCase()}</span>
                  <ChevronDown className="w-3 h-3" />
                </button>

                <AnimatePresence>
                  {showFormatDropdown && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute right-0 top-full mt-1 z-10 bg-dark-800 border border-dark-500 shadow-lg"
                    >
                      {FORMAT_OPTIONS.map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => {
                            setFormat(opt.id);
                            setShowFormatDropdown(false);
                          }}
                          className={`w-full px-4 py-2 text-left text-sm font-mono transition-colors ${
                            format === opt.id
                              ? 'text-terminal-green bg-terminal-green/10'
                              : 'text-gray-400 hover:text-white hover:bg-dark-700'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={!track.trim() || queueSearchMutation.isPending}
                className="px-6 btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {queueSearchMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                Add
              </button>
            </div>

            {/* Suggestions */}
            {searchTerm && suggestions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-2"
              >
                <div className="flex gap-2 items-center font-mono text-xs text-gray-500">
                  <Sparkles className="w-3 h-3" />
                  <span>Already in library</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {suggestions.slice(0, 4).map((item) => (
                    <Link
                      key={item.id}
                      to={`/items/${item.id}`}
                      className="px-2 py-1 font-mono text-xs border transition-all duration-200 bg-dark-700 border-terminal-green/30 text-terminal-green hover:border-terminal-green hover:bg-dark-600 truncate max-w-[200px]"
                    >
                      {item.filename}
                    </Link>
                  ))}
                </div>
              </motion.div>
            )}

            {queueSearchMutation.isError && (
              <div className="p-3 font-mono text-xs text-red-500 border border-red-500 bg-red-500/10">
                Error: {(queueSearchMutation.error as Error).message}
              </div>
            )}
          </form>

          {/* Multi-track toggle */}
          <div className="mt-4 pt-4 border-t border-dark-500">
            <button
              type="button"
              onClick={() => setShowMultiTrack(!showMultiTrack)}
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-terminal-green transition-colors"
            >
              {showMultiTrack ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
              <Plus className="w-4 h-4" />
              Add Multiple Tracks
            </button>

            <AnimatePresence>
              {showMultiTrack && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <form onSubmit={handleSearchList} className="mt-4 space-y-4">
                    {/* List name */}
                    <div>
                      <input
                        type="text"
                        value={listName}
                        onChange={(e) => setListName(e.target.value)}
                        placeholder="List name (optional)"
                        className="w-full input-terminal text-sm"
                      />
                    </div>

                    {/* Track inputs */}
                    <div className="space-y-2">
                      {listTracks.map((item, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="flex gap-2"
                        >
                          <input
                            type="text"
                            value={item.artist}
                            onChange={(e) => updateListTrack(index, 'artist', e.target.value)}
                            placeholder="Artist"
                            className="w-1/3 input-terminal text-sm"
                          />
                          <input
                            type="text"
                            value={item.track}
                            onChange={(e) => updateListTrack(index, 'track', e.target.value)}
                            placeholder={`Track ${index + 1}`}
                            className="flex-1 input-terminal text-sm"
                          />
                          {listTracks.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeListTrack(index)}
                              className="px-2 text-gray-500 hover:text-red-500 transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </motion.div>
                      ))}

                      <button
                        type="button"
                        onClick={addListTrack}
                        className="flex gap-2 items-center text-sm text-gray-500 hover:text-terminal-green transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        Add another track
                      </button>
                    </div>

                    <button
                      type="submit"
                      disabled={validTrackCount === 0 || queueListMutation.isPending}
                      className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {queueListMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Plus className="w-4 h-4" />
                      )}
                      Add {validTrackCount} Track{validTrackCount !== 1 ? 's' : ''}
                    </button>

                    {queueListMutation.isError && (
                      <div className="p-3 font-mono text-xs text-red-500 border border-red-500 bg-red-500/10">
                        Error: {(queueListMutation.error as Error).message}
                      </div>
                    )}

                    {queueListMutation.isSuccess && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="p-3 font-mono text-xs border border-terminal-green bg-terminal-green/10 text-terminal-green"
                      >
                        Successfully queued {queueListMutation.data?.total_queued || 0} items!
                      </motion.div>
                    )}
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.section>

      {/* Services Section */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="space-y-4"
      >
        <h2 className="text-lg font-display font-bold text-gray-400">
          Import from Services
        </h2>

        <PlaylistBrowser
          connections={connections}
          isLoadingConnections={isLoadingConnections}
          onViewPlaylist={handleViewPlaylist}
          onImportPlaylist={handleImportPlaylist}
          importingPlaylistId={importingPlaylistId}
        />
      </motion.section>

      {/* Activity Section */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="space-y-4"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-display font-bold text-gray-400">
            Recent Activity
          </h2>
          <Link
            to="/history"
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-terminal-green transition-colors"
          >
            View History
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="card-terminal">
          <div className="text-center py-6 text-gray-500 text-sm">
            <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>Recent imports will appear here</p>
            <p className="text-xs mt-1">Activity feed coming soon</p>
          </div>
        </div>
      </motion.section>

      {/* Playlist Detail Modal */}
      {selectedPlaylist && (
        <PlaylistDetailModal
          service={selectedPlaylist.service}
          playlist={selectedPlaylist.playlist}
          onClose={() => setSelectedPlaylist(null)}
          onImport={() => handleImportPlaylist(selectedPlaylist.service, selectedPlaylist.playlist)}
          isImporting={importingPlaylistId === selectedPlaylist.playlist.id}
        />
      )}
    </div>
  );
}
