import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Search as SearchIcon, Plus, Sparkles, Loader2, CheckCircle2, XCircle, Clock, Download, X } from 'lucide-react';
import { api } from '../lib/api';
import { useAppStore } from '../store';
import { Link } from 'react-router-dom';
import type { ActiveDownload } from '../types';

// Progress popup component
function DownloadProgressPopup({
  download,
  format,
  onDismiss
}: {
  download: ActiveDownload;
  format: AudioFormat;
  onDismiss?: () => void;
}) {
  const getStageInfo = () => {
    switch (download.stage) {
      case 'searching':
        return {
          icon: <Loader2 className="w-5 h-5 animate-spin" />,
          text: `Searching for "${download.query}" in ${format} format`,
          subtext: download.resultsCount !== undefined
            ? `Found ${download.resultsCount} files from ${download.usersCount || 0} users`
            : 'Querying network...',
          color: 'text-blue-400',
          bgColor: 'border-blue-500/50 bg-blue-500/10',
          canDismiss: false,
        };
      case 'selecting':
        return {
          icon: <Loader2 className="w-5 h-5 animate-spin" />,
          text: `Found ${download.resultsCount || 0} results`,
          subtext: download.selectedFile
            ? `Selected: ${download.selectedFile} from ${download.selectedUser}`
            : 'Selecting best file...',
          color: 'text-blue-400',
          bgColor: 'border-blue-500/50 bg-blue-500/10',
          canDismiss: false,
        };
      case 'downloading':
        return {
          icon: <Download className="w-5 h-5" />,
          text: `Downloading: ${download.filename || 'file'}`,
          subtext: download.progressPct !== undefined
            ? `${download.progressPct.toFixed(1)}% (${((download.bytesDownloaded || 0) / 1024 / 1024).toFixed(2)} / ${((download.totalBytes || 0) / 1024 / 1024).toFixed(2)} MB) - ${(download.speedKbps || 0).toFixed(1)} KB/s`
            : 'Starting download...',
          color: 'text-terminal-green',
          bgColor: 'border-terminal-green/50 bg-terminal-green/10',
          progress: download.progressPct,
          canDismiss: false,
        };
      case 'completed':
        return {
          icon: <CheckCircle2 className="w-5 h-5" />,
          text: 'Download complete!',
          subtext: download.filename || 'File ready',
          color: 'text-terminal-green',
          bgColor: 'border-terminal-green/50 bg-terminal-green/10',
          showDownload: true,
          canDismiss: true,
        };
      case 'failed':
        return {
          icon: <XCircle className="w-5 h-5" />,
          text: 'Download failed',
          subtext: download.error || 'Unknown error',
          color: 'text-red-500',
          bgColor: 'border-red-500/50 bg-red-500/10',
          canDismiss: true,
        };
      case 'queued':
        return {
          icon: <Clock className="w-5 h-5" />,
          text: 'Download queued',
          subtext: download.error || 'Waiting for peer...',
          color: 'text-yellow-500',
          bgColor: 'border-yellow-500/50 bg-yellow-500/10',
          canDismiss: false,
        };
      case 'duplicate':
        return {
          icon: <CheckCircle2 className="w-5 h-5" />,
          text: 'Already in library',
          subtext: download.filename || 'File already downloaded',
          color: 'text-cyan-400',
          bgColor: 'border-cyan-500/50 bg-cyan-500/10',
          canDismiss: true,
        };
      default:
        return {
          icon: <Loader2 className="w-5 h-5 animate-spin" />,
          text: 'Processing...',
          subtext: '',
          color: 'text-gray-400',
          bgColor: 'border-gray-500/50 bg-gray-500/10',
          canDismiss: false,
        };
    }
  };

  const info = getStageInfo();

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`relative p-4 border ${info.bgColor} rounded font-mono overflow-hidden`}
    >
      <div className="flex gap-3 items-start">
        <div className={info.color}>{info.icon}</div>
        <div className="flex-1 min-w-0">
          <div className={`font-bold ${info.color}`}>{info.text}</div>
          <div className="text-sm text-gray-400 truncate">{info.subtext}</div>
        </div>
        {info.showDownload && download.itemId > 0 && (
          <a
            href={api.getItemDownloadUrl(download.itemId)}
            download
            className="px-3 py-1 text-sm btn-primary"
          >
            Download
          </a>
        )}
        {info.canDismiss && onDismiss && (
          <button
            onClick={onDismiss}
            className="p-1 text-gray-400 transition-colors hover:text-gray-200"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      {/* Progress bar */}
      {info.progress !== undefined && (
        <div className="absolute right-0 bottom-0 left-0 h-1 bg-dark-600">
          <motion.div
            className="h-full bg-terminal-green"
            initial={{ width: 0 }}
            animate={{ width: `${info.progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      )}
    </motion.div>
  );
}

function SearchFilterBox({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <motion.div className="flex relative p-2 bg-opacity-0 border bg-dark-700 border-dark-500"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.125 }}
    >
      <span className="absolute top-0 left-0 px-1 -mt-3 ml-1 font-mono text-sm text-gray-500 bg-dark-900">{label}</span>
      {children}
    </motion.div>
  );
}

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

export function Search() {
  const [mode, setMode] = useState<'item' | 'list'>('item');
  // Single search inputs
  const [track, setTrack] = useState('');
  const [artist, setArtist] = useState('');
  const [format, setFormat] = useState<AudioFormat>('any');
  // List search inputs
  const [listTracks, setListTracks] = useState<ListTrackInput[]>([{ track: '', artist: '' }]);
  const [listName, setListName] = useState('');

  const { activeDownloads, dismissActiveDownload, addPendingSearch, generateClientId } = useAppStore();

  // Get all active downloads sorted by creation time (newest first)
  const allDownloads = Array.from(activeDownloads.values())
    .sort((a, b) => b.createdAt - a.createdAt);

  const { data: items } = useQuery({
    queryKey: ['items'],
    queryFn: () => api.getItems(),
  });

  const queueSearchMutation = useMutation({
    mutationFn: async ({ track, artist, format }: { track: string; artist: string; format: AudioFormat }) => {
      // Generate a unique client_id that will be used to match WebSocket events
      const clientId = generateClientId();
      // Build display query for UI feedback
      const displayQuery = artist.trim() ? `${artist.trim()} - ${track.trim()}` : track.trim();
      // Add pending search to store immediately for UI feedback
      addPendingSearch(displayQuery, clientId);
      // Then queue the actual search with the same client_id
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
      // Add pending searches to store for each track with unique client_ids
      // Note: List API doesn't support per-item client_ids yet, so these are for local UI tracking only
      data.tracks.forEach(t => {
        const displayQuery = t.artist.trim() ? `${t.artist.trim()} - ${t.track.trim()}` : t.track.trim();
        const clientId = generateClientId();
        addPendingSearch(displayQuery, clientId);
      });
      // Convert to API format and queue the list
      const apiTracks = data.tracks.map(t => ({
        track: t.track.trim(),
        artist: t.artist.trim() || undefined,
      }));
      return api.queueList(apiTracks, data.name, data.format);
    },
    onSuccess: () => {
      setListTracks([{ track: '', artist: '' }]);
      setListName('');
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

  // Filter suggestions based on track input
  const searchTerm = track.trim();
  const suggestions =
    items?.filter(
      (item) =>
        item.download_status === 'completed' &&
        searchTerm.length >= 3 &&
        item.filename.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-2"
      >
        <h1 className="text-4xl font-bold font-display text-terminal-green">
          Search Network
        </h1>
        <p className="text-sm text-gray-500">
          Find and download files from the Soulseek network
        </p>
      </motion.div>

      {/* Mode Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex gap-2 items-center"
      >
        {[
          { id: 'item', label: 'Single Item' },
          { id: 'list', label: 'Batch List' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setMode(tab.id as 'item' | 'list')}
            className={`px-6 py-3 font-mono transition-all duration-200 relative ${
              mode === tab.id
                ? 'text-terminal-green'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {mode === tab.id && (
              <motion.div
                layoutId="searchTab"
                className="absolute inset-0 border-2 border-terminal-green terminal-box-glow"
                transition={{
                  type: 'spring',
                  stiffness: 500,
                  damping: 30,
                }}
              />
            )}
            <span className="relative z-10">{tab.label}</span>
          </button>
        ))}
        {/* * Divider *
        <div className="w-[1px] h-8 bg-dark-500 mx-2" /> */}
        {/* Format Selection */}
        <SearchFilterBox label="Format">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="flex gap-4 items-center"
          >
            <div className="flex gap-1">
              {FORMAT_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setFormat(opt.id)}
                  className={`px-3 py-1.5 font-mono text-sm transition-all duration-200 border ${
                    format === opt.id
                      ? 'border-terminal-green text-terminal-green bg-terminal-green/10'
                      : 'border-dark-500 text-gray-500 hover:text-gray-300 hover:border-gray-500'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </motion.div>
        </SearchFilterBox>
      </motion.div>

      {/* Search Forms */}
      <motion.div
        key={mode}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="card-terminal"
      >
        {mode === 'item' ? (
          <form onSubmit={handleSearchItem} className="space-y-6">
            <div className="flex gap-4">
              {/* Artist input (optional) */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="flex-1"
              >
                <label className="block mb-2 font-mono text-sm text-terminal-green">
                  Artist <span className="text-gray-500">(optional)</span>
                </label>
                <input
                  type="text"
                  value={artist}
                  onChange={(e) => setArtist(e.target.value)}
                  placeholder="Artist name"
                  className="w-full input-terminal"
                />
              </motion.div>

              {/* Track input (required) */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="flex-1"
              >
                <label className="block mb-2 font-mono text-sm text-terminal-green">
                  Track <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <SearchIcon className="absolute left-4 top-1/2 w-5 h-5 text-gray-500 -translate-y-1/2" />
                  <input
                    type="text"
                    value={track}
                    onChange={(e) => setTrack(e.target.value)}
                    placeholder="Track name"
                    className="pl-12 w-full input-terminal"
                  />
                </div>
              </motion.div>
            </div>

            {/* Suggestions */}
            {searchTerm && suggestions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-2"
              >
                <div className="flex gap-2 items-center font-mono text-sm text-gray-500">
                  <Sparkles className="w-4 h-4" />
                  <span>Already Downloaded</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {suggestions.slice(0, 6).map((item) => (
                    <Link
                      key={item.id}
                      to={`/items/${item.id}`}
                      className="px-3 py-1 font-mono text-sm border transition-all duration-200 bg-dark-700 border-terminal-green/30 text-terminal-green hover:border-terminal-green hover:bg-dark-600"
                    >
                      {item.filename}
                    </Link>
                  ))}
                </div>
              </motion.div>
            )}

            <button
              type="submit"
              disabled={!track.trim()}
              className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              SEARCH & DOWNLOAD
            </button>

            {queueSearchMutation.isError && (
              <div className="p-4 font-mono text-sm text-red-500 border border-red-500 bg-red-500/10">
                Error: {(queueSearchMutation.error as Error).message}
              </div>
            )}

            {/* Download progress popups - show all active downloads */}
            <AnimatePresence>
              {allDownloads.length > 0 && (
                <div className="space-y-3">
                  {allDownloads.map((download) => (
                    <DownloadProgressPopup
                      key={download.trackingId}
                      download={download}
                      format={format}
                      onDismiss={() => dismissActiveDownload(download.trackingId)}
                    />
                  ))}
                </div>
              )}
            </AnimatePresence>
          </form>
        ) : (
          <form onSubmit={handleSearchList} className="space-y-6">
            <div>
              <label className="block mb-2 font-mono text-sm text-terminal-green">
                List Name (Optional)
              </label>
              <input
                type="text"
                value={listName}
                onChange={(e) => setListName(e.target.value)}
                placeholder="My Playlist"
                className="w-full input-terminal"
              />
            </div>

            <div className="space-y-3">
              <div className="flex gap-4 font-mono text-sm text-terminal-green">
                <span className="flex-1">Artist <span className="text-gray-500">(optional)</span></span>
                <span className="flex-1">Track <span className="text-red-400">*</span></span>
                <span className="w-10"></span>
              </div>

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
                    className="flex-1 input-terminal"
                  />
                  <input
                    type="text"
                    value={item.track}
                    onChange={(e) => updateListTrack(index, 'track', e.target.value)}
                    placeholder={`Track ${index + 1}`}
                    className="flex-1 input-terminal"
                  />
                  {listTracks.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeListTrack(index)}
                      className="px-3 btn-secondary"
                    >
                      ✕
                    </button>
                  )}
                </motion.div>
              ))}

              <button
                type="button"
                onClick={addListTrack}
                className="flex gap-2 justify-center items-center w-full btn-secondary"
              >
                <Plus className="w-4 h-4" />
                Add Track
              </button>
            </div>

            <button
              type="submit"
              disabled={listTracks.filter((t) => t.track.trim()).length === 0}
              className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {`SEARCH & DOWNLOAD ${listTracks.filter((t) => t.track.trim()).length} ITEMS`}
            </button>

            {queueListMutation.isError && (
              <div className="p-4 font-mono text-sm text-red-500 border border-red-500 bg-red-500/10">
                Error: {(queueListMutation.error as Error).message}
              </div>
            )}

            {queueListMutation.isSuccess && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-4 font-mono text-sm border border-terminal-green bg-terminal-green/10 text-terminal-green"
              >
                Successfully queued {queueListMutation.data?.total_queued || 0} items for download!
              </motion.div>
            )}

            {/* Download progress popups for list mode too */}
            <AnimatePresence>
              {allDownloads.length > 0 && (
                <div className="space-y-3">
                  {allDownloads.map((download) => (
                    <DownloadProgressPopup
                      key={download.trackingId}
                      download={download}
                      format={format}
                      onDismiss={() => dismissActiveDownload(download.trackingId)}
                    />
                  ))}
                </div>
              )}
            </AnimatePresence>
          </form>
        )}
      </motion.div>
    </div>
  );
}
