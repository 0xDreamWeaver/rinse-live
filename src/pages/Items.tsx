import { useMemo, useState, useEffect, ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table';
import { motion } from 'framer-motion';
import { Download, Trash2, Search, CheckSquare, Square, Loader2, Play, Pause, RotateCcw, RefreshCw, Music } from 'lucide-react';
import { api } from '../lib/api';
import { useAppStore, useAudioPlayer } from '../store';
import { useShallow } from 'zustand/react/shallow';
import { Link } from 'react-router-dom';
import { PlayingIndicator } from '../components/PlayingIndicator';
import type { Item } from '../types';

const columnHelper = createColumnHelper<Item>();

// Highlight matching text in search results
function HighlightMatch({ text, searchTerm }: { text: string; searchTerm: string }): ReactNode {
  if (!searchTerm || !text) return text;

  const lowerText = text.toLowerCase();
  const lowerSearch = searchTerm.toLowerCase();
  const index = lowerText.indexOf(lowerSearch);

  if (index === -1) return text;

  return (
    <>
      {text.slice(0, index)}
      <span className="font-bold text-terminal-green">{text.slice(index, index + searchTerm.length)}</span>
      {text.slice(index + searchTerm.length)}
    </>
  );
}

// Custom global filter function that searches artist, title, and filename
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const globalFilterFn = (row: any, _columnId: string, filterValue: string) => {
  const search = (filterValue || '').toLowerCase();
  if (!search) return true;

  const item = row.original as Item;
  const title = (item.meta_title || item.filename).toLowerCase();
  const artist = (item.meta_artist || '').toLowerCase();
  const filename = item.filename.toLowerCase();

  return title.includes(search) || artist.includes(search) || filename.includes(search);
};

export function Items() {
  const [globalFilter, setGlobalFilter] = useState('');
  const queryClient = useQueryClient();

  const { selectedItemIds, toggleItemSelection, clearItemSelection, itemsNeedRefresh, setItemsNeedRefresh, activeDownloads, progressUpdates } =
    useAppStore(
      useShallow((state) => ({
        selectedItemIds: state.selectedItemIds,
        toggleItemSelection: state.toggleItemSelection,
        clearItemSelection: state.clearItemSelection,
        itemsNeedRefresh: state.itemsNeedRefresh,
        setItemsNeedRefresh: state.setItemsNeedRefresh,
        activeDownloads: state.activeDownloads,
        progressUpdates: state.progressUpdates,
      }))
    );
  const { currentTrack, isPlaying, playTrackFromQueue, pausePlayback } = useAudioPlayer();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['items'],
    queryFn: () => api.getItems(),
  });

  // Auto-refresh when WebSocket indicates items changed
  useEffect(() => {
    if (itemsNeedRefresh) {
      queryClient.invalidateQueries({ queryKey: ['items'] });
      setItemsNeedRefresh(false);
    }
  }, [itemsNeedRefresh, queryClient, setItemsNeedRefresh]);

  // Get progress for a specific item from WebSocket updates
  const getItemProgress = (itemId: number) => {
    // activeDownloads is keyed by clientId (string), so we need to find by itemId
    for (const download of activeDownloads.values()) {
      if (download.itemId === itemId && download.stage === 'downloading') {
        return download.progressPct || 0;
      }
    }
    const progress = progressUpdates.get(itemId);
    if (progress && progress.status === 'downloading') {
      return progress.progress * 100;
    }
    return null;
  };

  const deleteMutation = useMutation({
    mutationFn: (ids: number[]) => api.batchDeleteItems(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
      clearItemSelection();
    },
  });

  const retryMutation = useMutation({
    mutationFn: async ({ id, track, artist }: { id: number; track: string; artist?: string }) => {
      // Queue a new search with the same track/artist
      await api.queueSearch(track, artist);
      // Delete the failed item
      await api.deleteItem(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
    },
  });

  const refreshMetadataMutation = useMutation({
    mutationFn: (ids: number[]) => api.batchRefreshMetadata(ids),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
      clearItemSelection();
      const successCount = data.results.filter(r => r.success).length;
      const failCount = data.results.filter(r => !r.success).length;
      if (failCount > 0) {
        alert(`Metadata refreshed for ${successCount} items. ${failCount} items failed (may be rate limited).`);
      }
    },
  });

  const columns = useMemo(
    () => [
      columnHelper.display({
        id: 'select',
        header: () => (
          <button
            onClick={() => {
              const allIds = items.map((item) => item.id);
              if (selectedItemIds.length === allIds.length) {
                clearItemSelection();
              } else {
                allIds.forEach((id) => {
                  if (!selectedItemIds.includes(id)) {
                    toggleItemSelection(id);
                  }
                });
              }
            }}
            className="transition-colors text-terminal-green hover:text-terminal-green-dark"
          >
            {selectedItemIds.length === items.length && items.length > 0 ? (
              <CheckSquare className="w-5 h-5" />
            ) : (
              <Square className="w-5 h-5" />
            )}
          </button>
        ),
        cell: ({ row }) => (
          <button
            onClick={() => toggleItemSelection(row.original.id)}
            className="transition-colors text-terminal-green hover:text-terminal-green-dark"
          >
            {selectedItemIds.includes(row.original.id) ? (
              <CheckSquare className="w-5 h-5" />
            ) : (
              <Square className="w-5 h-5" />
            )}
          </button>
        ),
      }),
      columnHelper.display({
        id: 'track',
        header: 'Track',
        cell: ({ row }) => {
          const item = row.original;
          const isCurrentTrack = currentTrack?.id === item.id;
          const isThisPlaying = isCurrentTrack && isPlaying;
          const isCompleted = item.download_status === 'completed';

          // Use metadata if available, fall back to filename
          const title = item.meta_title || item.filename;
          const artist = item.meta_artist;
          const albumArt = item.meta_album_art_url;

          return (
            <div className="flex items-center gap-3">
              {/* Cover Art / Play Button */}
              <div className="relative flex-shrink-0 w-12 h-12 group">
                {albumArt ? (
                  <img
                    src={albumArt}
                    alt={title}
                    className="object-cover w-full h-full rounded"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex items-center justify-center w-full h-full rounded bg-dark-600">
                    <Music className="w-5 h-5 text-gray-500" />
                  </div>
                )}
                {/* Playing indicator (behind play button) */}
                {isThisPlaying && (
                  <PlayingIndicator />
                )}
                {/* Play/Pause button overlay (always on top) */}
                {isCompleted && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isThisPlaying) {
                        pausePlayback();
                      } else {
                        // Build queue from all completed items and play from this track
                        const completedItems = items.filter(i => i.download_status === 'completed');
                        const trackIndex = completedItems.findIndex(i => i.id === item.id);
                        if (trackIndex >= 0) {
                          playTrackFromQueue(completedItems, trackIndex);
                        }
                      }
                    }}
                    className="absolute inset-0 z-10 flex items-center justify-center transition-opacity bg-black/60 opacity-0 group-hover:opacity-100 rounded"
                  >
                    {isThisPlaying ? (
                      <Pause className="w-5 h-5 text-terminal-green" />
                    ) : (
                      <Play className="w-5 h-5 ml-0.5 text-terminal-green" />
                    )}
                  </button>
                )}
              </div>

              {/* Title / Artist */}
              <div className="flex flex-col min-w-0">
                <Link
                  to={`/items/${item.id}`}
                  className="font-medium truncate transition-colors hover:text-terminal-green-dark hover:underline"
                  title={title}
                >
                  <HighlightMatch text={title} searchTerm={globalFilter} />
                </Link>
                {artist ? (
                  <span className="text-sm truncate text-gray-400" title={artist}>
                    <HighlightMatch text={artist} searchTerm={globalFilter} />
                  </span>
                ) : (
                  <span className="text-sm truncate text-gray-500 italic">
                    Unknown Artist
                  </span>
                )}
              </div>
            </div>
          );
        },
      }),
      columnHelper.accessor('meta_bpm', {
        header: 'BPM',
        cell: (info) => {
          const bpm = info.getValue();
          return (
            <span className="font-mono text-gray-400">
              {bpm || '-'}
            </span>
          );
        },
      }),
      columnHelper.accessor('file_size', {
        header: 'Size',
        cell: (info) => (
          <span className="font-mono text-gray-400">
            {(info.getValue() / 1024 / 1024).toFixed(2)} MB
          </span>
        ),
      }),
      columnHelper.accessor('download_status', {
        header: 'Status',
        cell: (info) => {
          const status = info.getValue();
          const itemId = info.row.original.id;
          const progress = getItemProgress(itemId);
          const colors: Record<string, string> = {
            pending: 'text-yellow-500',
            downloading: 'text-blue-500',
            completed: 'text-terminal-green',
            failed: 'text-red-500',
            queued: 'text-orange-500',
          };
          return (
            <div className="flex gap-2 items-center">
              {status === 'downloading' && (
                <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
              )}
              <span className={`font-mono font-bold ${colors[status] || 'text-gray-400'}`}>
                {status.toUpperCase()}
                {progress !== null && status === 'downloading' && (
                  <span className="ml-1 text-xs font-normal">({progress.toFixed(0)}%)</span>
                )}
              </span>
            </div>
          );
        },
      }),
      columnHelper.display({
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          <div className="flex gap-2">
            {row.original.download_status === 'completed' && (
              <a
                href={api.getItemDownloadUrl(row.original.id)}
                download
                className="px-3 py-1 text-sm btn-secondary"
                title="Download file"
              >
                <Download className="w-4 h-4" />
              </a>
            )}
            {row.original.download_status === 'failed' && (
              <button
                onClick={() => {
                  const item = row.original;
                  // Use original_track if available, otherwise fall back to original_query
                  const track = item.original_track || item.original_query;
                  const artist = item.original_artist || undefined;
                  retryMutation.mutate({ id: item.id, track, artist });
                }}
                disabled={retryMutation.isPending}
                className="px-3 py-1 text-sm btn-secondary"
                title="Retry download"
              >
                <RotateCcw className={`w-4 h-4 ${retryMutation.isPending ? 'animate-spin' : ''}`} />
              </button>
            )}
          </div>
        ),
      }),
    ],
    [items, selectedItemIds, toggleItemSelection, clearItemSelection, currentTrack, isPlaying, playTrackFromQueue, pausePlayback, retryMutation]
  );

  const table = useReactTable({
    data: items,
    columns,
    state: {
      globalFilter,
    },
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const handleBatchDelete = () => {
    if (selectedItemIds.length > 0 && confirm(`Delete ${selectedItemIds.length} items?`)) {
      deleteMutation.mutate(selectedItemIds);
    }
  };

  const handleRefreshMetadata = () => {
    // Filter to only completed items (metadata only makes sense for downloaded files)
    const completedIds = selectedItemIds.filter(id => {
      const item = items.find(i => i.id === id);
      return item?.download_status === 'completed';
    });

    if (completedIds.length === 0) {
      alert('No completed items selected. Metadata can only be refreshed for downloaded items.');
      return;
    }

    if (completedIds.length !== selectedItemIds.length) {
      if (!confirm(`Only ${completedIds.length} of ${selectedItemIds.length} selected items are completed. Refresh metadata for those ${completedIds.length} items?`)) {
        return;
      }
    }

    refreshMetadataMutation.mutate(completedIds);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="font-mono animate-pulse text-terminal-green">
          LOADING...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-between items-center"
      >
        <div>
          <div className="flex gap-1 items-start">
            <h1 className="text-4xl font-bold font-display text-terminal-green">
              Tracks
            </h1>
            <span className="font-mono text-2xl font-bold text-gray-500">
              [
                <span className="text-gray-200">
                  {items.length}
                </span>
              ]
            </span>
          </div>
          <p className="mt-2 text-sm text-gray-500">
            View your downloaded tracks and queued downloads
          </p>
        </div>

        {selectedItemIds.length > 0 && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex gap-2"
          >
            <button
              onClick={handleRefreshMetadata}
              disabled={refreshMetadataMutation.isPending}
              className="flex gap-2 items-center btn-secondary"
            >
              <RefreshCw className={`w-4 h-4 ${refreshMetadataMutation.isPending ? 'animate-spin' : ''}`} />
              Refresh Metadata
            </button>
            <button
              onClick={handleBatchDelete}
              disabled={deleteMutation.isPending}
              className="flex gap-2 items-center btn-secondary"
            >
              <Trash2 className="w-4 h-4" />
              Delete {selectedItemIds.length}
            </button>
          </motion.div>
        )}
      </motion.div>

      {/* Search Filter */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="relative">
          <Search className="absolute left-4 top-1/2 w-5 h-5 text-gray-500 -translate-y-1/2" />
          <input
            type="text"
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder="Filter items..."
            className="pl-12 w-full input-terminal"
          />
        </div>
      </motion.div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="overflow-x-auto card-terminal"
      >
        <table className="w-full">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b border-dark-500">
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-4 py-3 font-mono text-sm text-left text-terminal-green"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row, index) => {
              const itemId = row.original.id;
              const progress = getItemProgress(itemId);
              const isDownloading = row.original.download_status === 'downloading';

              return (
                <motion.tr
                  key={row.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="relative border-b transition-colors border-dark-600 hover:bg-dark-700"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3 text-sm">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                  {/* Progress bar at bottom of row */}
                  {isDownloading && progress !== null && (
                    <td colSpan={row.getVisibleCells().length} className="absolute bottom-0 left-0 right-0 h-0.5 p-0">
                      <div className="h-full bg-dark-500">
                        <motion.div
                          className="h-full bg-terminal-green"
                          initial={{ width: 0 }}
                          animate={{ width: `${progress}%` }}
                          transition={{ duration: 0.3 }}
                        />
                      </div>
                    </td>
                  )}
                </motion.tr>
              );
            })}
          </tbody>
        </table>

        {table.getRowModel().rows.length === 0 && (
          <div className="py-12 font-mono text-center text-gray-500">
            No items found
          </div>
        )}
      </motion.div>
    </div>
  );
}
