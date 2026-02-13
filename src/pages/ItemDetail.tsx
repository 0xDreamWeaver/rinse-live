import { useState, useRef, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, ArrowLeft, Clock, HardDrive, Music, User, Play, Pause, Disc, Calendar, Tag, Hash, Building2, Search, Trash2, RefreshCw, MoreHorizontal } from 'lucide-react';
import { api } from '../lib/api';
import { useAudioPlayer } from '../store';

export function ItemDetail() {
  const { id } = useParams<{ id: string }>();
  const { currentTrack, isPlaying, playTrack, pausePlayback } = useAudioPlayer();
  const queryClient = useQueryClient();

  // Manage Metadata dropdown state
  const [showMetadataMenu, setShowMetadataMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMetadataMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const { data: item, isLoading } = useQuery({
    queryKey: ['item', id],
    queryFn: () => api.getItem(Number(id)),
    enabled: !!id,
  });

  const clearMetadataMutation = useMutation({
    mutationFn: () => api.clearItemMetadata(Number(id)),
    onSuccess: () => {
      setShowMetadataMenu(false);
      queryClient.invalidateQueries({ queryKey: ['item', id] });
      queryClient.invalidateQueries({ queryKey: ['items'] });
    },
  });

  const refreshMetadataMutation = useMutation({
    mutationFn: () => api.refreshItemMetadata(Number(id)),
    onSuccess: () => {
      setShowMetadataMenu(false);
      queryClient.invalidateQueries({ queryKey: ['item', id] });
      queryClient.invalidateQueries({ queryKey: ['items'] });
    },
  });

  const handleRefreshMetadata = () => {
    if (confirm('Refresh metadata from online sources? This may overwrite current metadata.')) {
      refreshMetadataMutation.mutate();
    }
  };

  const handleClearMetadata = () => {
    if (confirm('Clear all metadata for this track? The track will show only the filename.')) {
      clearMetadataMutation.mutate();
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="font-mono text-terminal-green animate-pulse">
          LOADING...
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="card-terminal text-center py-12">
        <p className="font-mono text-red-500">Item not found</p>
      </div>
    );
  }

  // Use metadata if available
  const title = item.meta_title || item.filename;
  const artist = item.meta_artist;
  const album = item.meta_album;
  const albumArt = item.meta_album_art_url;

  // Format duration from milliseconds
  const formatDuration = (ms: number | null) => {
    if (!ms) return null;
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
  };

  // Track metadata fields
  const trackMetadata = [
    { label: 'BPM', value: item.meta_bpm, icon: Clock },
    { label: 'Key', value: item.meta_key, icon: Music },
    { label: 'Duration', value: formatDuration(item.meta_duration_ms), icon: Clock },
    { label: 'Genre', value: item.meta_genre, icon: Tag },
    { label: 'Year', value: item.meta_year, icon: Calendar },
    { label: 'Album', value: album, icon: Disc },
    { label: 'Track #', value: item.meta_track_number, icon: Hash },
    { label: 'Label', value: item.meta_label, icon: Building2 },
  ].filter(field => field.value); // Only show fields with values

  // File info fields
  const fileInfo = [
    { label: 'Filename', value: item.filename, icon: Music },
    { label: 'File Size', value: `${(item.file_size / 1024 / 1024).toFixed(2)} MB`, icon: HardDrive },
    { label: 'Bitrate', value: item.bitrate ? `${item.bitrate} kbps` : null, icon: Music },
    { label: 'Extension', value: item.extension.toUpperCase(), icon: Music },
    { label: 'Source', value: item.source_username, icon: User },
    { label: 'Original Query', value: item.original_query, icon: Search },
  ].filter(field => field.value);

  const getStatusColor = () => {
    const colors: Record<string, string> = {
      pending: 'text-yellow-500',
      downloading: 'text-blue-500',
      completed: 'text-terminal-green',
      failed: 'text-red-500',
      queued: 'text-orange-500',
      deleted: 'text-gray-500',
    };
    return colors[item.download_status] || 'text-gray-500';
  };

  const isCurrentTrack = currentTrack?.id === item.id;
  const isThisPlaying = isCurrentTrack && isPlaying;

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
        <Link to="/items" className="inline-flex items-center gap-2 text-terminal-green hover:text-terminal-green-dark transition-colors font-mono">
          <ArrowLeft className="w-4 h-4" />
          Back to Tracks
        </Link>
      </motion.div>

      {/* Header with Cover Art */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex gap-6"
      >
        {/* Cover Art */}
        <div className="relative flex-shrink-0 w-48 h-48 group">
          {albumArt ? (
            <img
              src={albumArt}
              alt={title}
              className="object-cover w-full h-full rounded-lg shadow-lg"
            />
          ) : (
            <div className="flex items-center justify-center w-full h-full rounded-lg bg-dark-700 shadow-lg">
              <Music className="w-16 h-16 text-gray-500" />
            </div>
          )}
          {/* Play button overlay */}
          {item.download_status === 'completed' && (
            <button
              onClick={() => {
                if (isThisPlaying) {
                  pausePlayback();
                } else {
                  playTrack(item);
                }
              }}
              className="absolute inset-0 flex items-center justify-center transition-opacity bg-black/50 opacity-0 group-hover:opacity-100 rounded-lg"
            >
              {isThisPlaying ? (
                <Pause className="w-12 h-12 text-terminal-green" />
              ) : (
                <Play className="w-12 h-12 ml-1 text-terminal-green" />
              )}
            </button>
          )}
          {/* Playing indicator */}
          {isThisPlaying && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
              <div className="flex gap-1 items-end h-8">
                <span className="w-2 bg-terminal-green animate-pulse rounded" style={{ height: '60%' }} />
                <span className="w-2 bg-terminal-green animate-pulse rounded" style={{ height: '100%', animationDelay: '0.1s' }} />
                <span className="w-2 bg-terminal-green animate-pulse rounded" style={{ height: '40%', animationDelay: '0.2s' }} />
              </div>
            </div>
          )}
        </div>

        {/* Title / Artist / Status */}
        <div className="flex-1 flex flex-col justify-center min-w-0">
          <h1 className="text-3xl font-bold text-terminal-green break-words">
            {title}
          </h1>
          {artist ? (
            <p className="mt-2 text-xl text-gray-300">{artist}</p>
          ) : (
            <p className="mt-2 text-xl text-gray-500 italic">Unknown Artist</p>
          )}
          {album && (
            <p className="mt-1 text-sm text-gray-400">
              <Disc className="inline w-4 h-4 mr-1" />
              {album}
            </p>
          )}
          <div className={`mt-4 font-mono font-bold ${getStatusColor()}`}>
            {item.download_status.toUpperCase()}
          </div>

          {/* Metadata sources */}
          {item.metadata_sources && (
            <div className="mt-2 text-xs text-gray-500">
              Metadata from: {JSON.parse(item.metadata_sources).join(', ')}
            </div>
          )}
        </div>

        {/* Manage Metadata Dropdown */}
        {item.download_status === 'completed' && (
          <div className="relative ml-auto flex-shrink-0" ref={menuRef}>
            <button
              onClick={() => setShowMetadataMenu(!showMetadataMenu)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-gray-400 hover:text-terminal-green border border-gray-600 hover:border-terminal-green transition-colors"
            >
              <MoreHorizontal className="w-4 h-4" />
              Manage Metadata
            </button>

            <AnimatePresence>
              {showMetadataMenu && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute right-0 mt-2 w-56 bg-dark-800 border border-dark-500 shadow-lg z-50"
                >
                  <button
                    onClick={handleRefreshMetadata}
                    disabled={refreshMetadataMutation.isPending}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left text-gray-300 hover:bg-dark-700 hover:text-terminal-green transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 ${refreshMetadataMutation.isPending ? 'animate-spin' : ''}`} />
                    Refresh Metadata
                  </button>
                  {item.metadata_fetched_at && (
                    <>
                      <div className="border-t border-dark-600" />
                      <button
                        onClick={handleClearMetadata}
                        disabled={clearMetadataMutation.isPending}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left text-red-400 hover:bg-dark-700 hover:text-red-300 transition-colors disabled:opacity-50"
                      >
                        <Trash2 className="w-4 h-4" />
                        Clear Metadata
                      </button>
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </motion.div>

      {/* Track Metadata Section */}
      {trackMetadata.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-lg font-mono font-bold text-terminal-green mb-3">
            Track Info
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {trackMetadata.map((field, index) => (
              <motion.div
                key={field.label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 + index * 0.05 }}
                className="card-terminal"
              >
                <div className="flex items-start gap-3">
                  <field.icon className="w-5 h-5 text-terminal-green mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-mono text-gray-500">{field.label}</div>
                    <div className="font-mono text-terminal-green mt-1 truncate" title={String(field.value)}>
                      {field.value}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* File Info Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <h2 className="text-lg font-mono font-bold text-terminal-green mb-3">
          File Info
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {fileInfo.map((field, index) => (
            <motion.div
              key={field.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 + index * 0.05 }}
              className="card-terminal"
            >
              <div className="flex items-start gap-3">
                <field.icon className="w-5 h-5 text-terminal-green mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-mono text-gray-500">{field.label}</div>
                  <div className="font-mono text-terminal-green mt-1 break-all">
                    {field.value}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Progress Bar */}
      {item.download_status === 'downloading' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-terminal"
        >
          <div className="space-y-2">
            <div className="flex justify-between text-sm font-mono">
              <span className="text-gray-500">Download Progress</span>
              <span className="text-terminal-green">
                {(item.download_progress * 100).toFixed(0)}%
              </span>
            </div>
            <div className="h-2 bg-dark-700 border border-dark-500 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${item.download_progress * 100}%` }}
                className="h-full bg-terminal-green"
              />
            </div>
          </div>
        </motion.div>
      )}

      {/* Error Message */}
      {item.error_message && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-terminal border-red-500"
        >
          <div className="text-red-500 font-mono text-sm">{item.error_message}</div>
        </motion.div>
      )}

      {/* Download Button */}
      {item.download_status === 'completed' && (
        <motion.a
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          href={api.getItemDownloadUrl(item.id)}
          download
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          <Download className="w-5 h-5" />
          DOWNLOAD FILE
        </motion.a>
      )}
    </div>
  );
}
