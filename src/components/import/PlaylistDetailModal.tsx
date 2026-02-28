import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Music, Clock, Download, Loader2, ExternalLink, User } from 'lucide-react';
import { api } from '../../lib/api';
import type { MusicService, ExternalPlaylist, ExternalTrack } from '../../types';

interface PlaylistDetailModalProps {
  service: MusicService;
  playlist: ExternalPlaylist;
  onClose: () => void;
  onImport: () => void;
  isImporting: boolean;
}

// Format duration from ms
function formatDuration(ms: number | null): string {
  if (!ms) return '-:--';
  const seconds = Math.floor(ms / 1000);
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Format total duration
function formatTotalDuration(tracks: ExternalTrack[]): string {
  const totalMs = tracks.reduce((acc, t) => acc + (t.duration_ms || 0), 0);
  const totalMinutes = Math.floor(totalMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;

  if (hours === 0) {
    return `${mins} min`;
  }
  return `${hours} hr ${mins} min`;
}

export function PlaylistDetailModal({
  service,
  playlist,
  onClose,
  onImport,
  isImporting,
}: PlaylistDetailModalProps) {
  const [allTracks, setAllTracks] = useState<ExternalTrack[]>([]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Fetch tracks for the playlist
  const {
    data: tracksData,
    isLoading: isLoadingTracks,
  } = useQuery({
    queryKey: ['playlist-tracks', service, playlist.id],
    queryFn: () => api.getPlaylistTracks(service, playlist.id, 100, 0),
  });

  // Initialize tracks when first load completes
  useEffect(() => {
    if (tracksData?.tracks) {
      setAllTracks(tracksData.tracks);
    }
  }, [tracksData]);

  // Load more tracks
  const loadMoreTracks = async () => {
    if (!tracksData || allTracks.length >= tracksData.total) return;

    setIsLoadingMore(true);
    try {
      const moreData = await api.getPlaylistTracks(service, playlist.id, 100, allTracks.length);
      setAllTracks(prev => [...prev, ...moreData.tracks]);
    } catch (error) {
      console.error('Failed to load more tracks:', error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Close on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Lock body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-dark-800 border border-dark-500 w-full max-w-3xl max-h-[85vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="relative p-6 border-b border-dark-500">
            {/* Close Button - absolute positioned */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-gray-500 hover:text-terminal-green transition-colors z-10"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="flex gap-5 items-stretch">
              {/* Cover Art - sized to match info section */}
              <div className="w-36 h-36 flex-shrink-0 bg-dark-700 border border-dark-600">
                {playlist.image_url ? (
                  <img
                    src={playlist.image_url}
                    alt={playlist.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Music className="w-12 h-12 text-gray-600" />
                  </div>
                )}
              </div>

              {/* Info - flex column to distribute content */}
              <div className="flex-1 min-w-0 flex flex-col justify-between pr-8">
                <div>
                  <div className="text-xs text-gray-500 font-mono uppercase tracking-wider mb-1">
                    Playlist
                  </div>
                  <h2 className="text-2xl font-display font-bold text-terminal-green truncate">
                    {playlist.name}
                  </h2>

                  {playlist.description && (
                    <p className="text-sm text-gray-400 mt-1 line-clamp-2">
                      {playlist.description}
                    </p>
                  )}

                  <div className="flex items-center gap-4 mt-2 text-sm font-mono text-gray-400">
                    <span className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5" />
                      {playlist.owner_name}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Music className="w-3.5 h-3.5" />
                      {playlist.track_count} tracks
                    </span>
                    {allTracks.length > 0 && (
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        {formatTotalDuration(allTracks)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex gap-3 mt-3">
                  <button
                    onClick={onImport}
                    disabled={isImporting}
                    className="btn-primary flex items-center gap-2"
                  >
                    {isImporting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    Import All Tracks
                  </button>
                  {playlist.external_url && (
                    <a
                      href={playlist.external_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-secondary flex items-center gap-2"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Open in {service.charAt(0).toUpperCase() + service.slice(1)}
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Tracks List */}
          <div className="flex-1 overflow-y-auto">
            {isLoadingTracks ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 text-terminal-green animate-spin" />
              </div>
            ) : allTracks.length > 0 ? (
              <table className="w-full">
                <thead className="sticky top-0 bg-dark-800 border-b border-dark-600">
                  <tr className="text-left text-xs font-mono text-gray-500">
                    <th className="px-4 py-3 w-12">#</th>
                    <th className="px-4 py-3">Title</th>
                    <th className="px-4 py-3">Artist</th>
                    <th className="px-4 py-3">Album</th>
                    <th className="px-4 py-3 text-right w-16">
                      <Clock className="w-3.5 h-3.5 inline" />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {allTracks.map((track, index) => (
                    <motion.tr
                      key={track.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: Math.min(index * 0.02, 0.5) }}
                      className="border-b border-dark-600 hover:bg-dark-700/50 transition-colors"
                    >
                      <td className="px-4 py-3 text-sm font-mono text-gray-500">
                        {index + 1}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-white truncate max-w-[200px]">
                          {track.name}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-400 truncate max-w-[150px]">
                        {track.artists.join(', ')}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 truncate max-w-[150px]">
                        {track.album || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm font-mono text-gray-500 text-right">
                        {formatDuration(track.duration_ms)}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="flex items-center justify-center py-12 text-gray-500">
                <p>No tracks found</p>
              </div>
            )}

            {/* Load More */}
            {tracksData && allTracks.length < tracksData.total && (
              <div className="p-4 text-center">
                <button
                  onClick={loadMoreTracks}
                  disabled={isLoadingMore}
                  className="btn-secondary text-sm"
                >
                  {isLoadingMore ? (
                    <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                  ) : null}
                  Load More ({allTracks.length} of {tracksData.total})
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
