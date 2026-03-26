import { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, ArrowLeft, Calendar, FileText, Trash2, X, CheckSquare, Square, Play, Pause, MoreHorizontal, Pencil, RefreshCw, RotateCcw } from 'lucide-react';
import { api } from '../lib/api';
import { useAppStore, useAudioPlayer } from '../store';
import { useShallow } from 'zustand/react/shallow';
import { PlayingIndicator } from '../components/PlayingIndicator';
import { CoverArt } from '../components/CoverArt';

export function ListDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const {
    listsNeedRefresh,
    setListsNeedRefresh,
    selectedListItemIds,
    toggleListItemSelection,
    clearListItemSelection,
    setSelectedListItemIds
  } = useAppStore(
    useShallow((state) => ({
      listsNeedRefresh: state.listsNeedRefresh,
      setListsNeedRefresh: state.setListsNeedRefresh,
      selectedListItemIds: state.selectedListItemIds,
      toggleListItemSelection: state.toggleListItemSelection,
      clearListItemSelection: state.clearListItemSelection,
      setSelectedListItemIds: state.setSelectedListItemIds,
    }))
  );
  const { currentTrack, isPlaying, playTrackFromQueue, pausePlayback } = useAudioPlayer();

  const { data, isLoading } = useQuery({
    queryKey: ['list', id],
    queryFn: () => api.getList(Number(id)),
    enabled: !!id,
  });

  // Clear selection when navigating away
  useEffect(() => {
    return () => clearListItemSelection();
  }, [clearListItemSelection]);

  // Auto-refresh when WebSocket indicates lists changed
  useEffect(() => {
    if (listsNeedRefresh) {
      queryClient.invalidateQueries({ queryKey: ['list', id] });
      setListsNeedRefresh(false);
    }
  }, [listsNeedRefresh, queryClient, setListsNeedRefresh, id]);

  // Mutation for removing items from list
  const removeFromListMutation = useMutation({
    mutationFn: (itemIds: number[]) => api.batchRemoveItemsFromList(Number(id), itemIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['list', id] });
      clearListItemSelection();
    },
  });

  // Mutation for deleting items (soft delete)
  const deleteItemsMutation = useMutation({
    mutationFn: (itemIds: number[]) => api.batchDeleteItems(itemIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['list', id] });
      queryClient.invalidateQueries({ queryKey: ['items'] });
      clearListItemSelection();
    },
  });

  // Mutation for deleting the entire list (keep items)
  const deleteListMutation = useMutation({
    mutationFn: () => api.deleteList(Number(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lists'] });
      navigate('/lists');
    },
  });

  // Mutation for deleting list AND items
  const deleteListWithItemsMutation = useMutation({
    mutationFn: () => api.deleteListWithItems(Number(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lists'] });
      queryClient.invalidateQueries({ queryKey: ['items'] });
      navigate('/lists');
    },
  });

  // Mutation for renaming list
  const renameListMutation = useMutation({
    mutationFn: (name: string) => api.renameList(Number(id), name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['list', id] });
      queryClient.invalidateQueries({ queryKey: ['lists'] });
      setShowRenameModal(false);
      setNewListName('');
    },
  });

  const [skipExisting, setSkipExisting] = useState(true);

  // Mutation for refreshing metadata
  const refreshMetadataMutation = useMutation({
    mutationFn: ({ ids, skipExisting: skip }: { ids: number[]; skipExisting: boolean }) =>
      api.batchRefreshMetadata(ids, skip),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['list', id] });
      queryClient.invalidateQueries({ queryKey: ['items'] });
      clearListItemSelection();
      const successCount = data.results.filter(r => r.success).length;
      const failCount = data.results.filter(r => !r.success).length;
      if (failCount > 0) {
        alert(`Metadata refreshed for ${successCount} items. ${failCount} items failed (may be rate limited).`);
      }
    },
  });

  // Mutation for retrying a failed item
  const retryMutation = useMutation({
    mutationFn: async ({ itemId, track, artist }: { itemId: number; track: string; artist?: string }) => {
      await api.queueSearch(track, artist);
      await api.deleteItem(itemId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['list', id] });
      queryClient.invalidateQueries({ queryKey: ['items'] });
    },
  });

  // Popover and modal state
  const [showManageMenu, setShowManageMenu] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [newListName, setNewListName] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowManageMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDeleteListKeepItems = () => {
    setShowManageMenu(false);
    if (confirm(`Delete the list "${data?.name}"?\n\nThe items will remain in your library.`)) {
      deleteListMutation.mutate();
    }
  };

  const handleDeleteListAndItems = () => {
    setShowManageMenu(false);
    if (confirm(`Delete the list "${data?.name}" AND all its items?\n\nThis will permanently delete ${data?.items?.length || 0} files. This cannot be undone.`)) {
      deleteListWithItemsMutation.mutate();
    }
  };

  const handleRename = () => {
    setShowManageMenu(false);
    setNewListName(data?.name || '');
    setShowRenameModal(true);
  };

  const submitRename = () => {
    if (newListName.trim() && newListName !== data?.name) {
      renameListMutation.mutate(newListName.trim());
    }
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

  if (!data) {
    return (
      <div className="p-6 py-12 text-center card-terminal">
        <p className="font-mono text-red-500">List not found</p>
      </div>
    );
  }

  // Note: Backend flattens list fields to root level, items is a direct property
  const list = data;
  const items = data.items;

  // Filter out deleted items for selection (can't select deleted items)
  const selectableItems = items.filter(item => item.download_status !== 'deleted');

  const handleSelectAll = () => {
    const allIds = selectableItems.map(item => item.id);
    if (selectedListItemIds.length === allIds.length) {
      clearListItemSelection();
    } else {
      setSelectedListItemIds(allIds);
    }
  };

  const handleBatchRemove = () => {
    if (selectedListItemIds.length > 0 && confirm(`Remove ${selectedListItemIds.length} items from this list?`)) {
      removeFromListMutation.mutate(selectedListItemIds);
    }
  };

  const handleBatchDelete = () => {
    if (selectedListItemIds.length > 0 && confirm(`Delete ${selectedListItemIds.length} items? This will remove them from all lists and mark them as deleted.`)) {
      deleteItemsMutation.mutate(selectedListItemIds);
    }
  };

  const handleRefreshMetadata = () => {
    // Filter to only completed items (metadata only makes sense for downloaded files)
    const completedIds = selectedListItemIds.filter(itemId => {
      const item = items.find(i => i.id === itemId);
      return item?.download_status === 'completed';
    });

    if (completedIds.length === 0) {
      alert('No completed items selected. Metadata can only be refreshed for downloaded items.');
      return;
    }

    if (completedIds.length !== selectedListItemIds.length) {
      if (!confirm(`Only ${completedIds.length} of ${selectedListItemIds.length} selected items are completed. Refresh metadata for those ${completedIds.length} items?`)) {
        return;
      }
    }

    refreshMetadataMutation.mutate({ ids: completedIds, skipExisting });
  };

  const getStatusColor = () => {
    const colors = {
      pending: 'text-yellow-500',
      downloading: 'text-blue-500',
      completed: 'text-terminal-green',
      partial: 'text-orange-500',
      failed: 'text-red-500',
    };
    return colors[list.status as keyof typeof colors] || 'text-gray-500';
  };

  const progress = list.total_items > 0 ? (list.completed_items / list.total_items) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
        <Link to="/lists" className="inline-flex gap-2 items-center font-mono transition-colors text-terminal-green hover:text-terminal-green-dark">
          <ArrowLeft className="w-4 h-4" />
          Back to Lists
        </Link>
      </motion.div>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="space-y-4"
      >
        <div className="flex justify-between items-center">
          <h1 className="text-4xl font-bold font-display text-terminal-green">
            {list.name}
          </h1>

          {selectedListItemIds.length > 0 && (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex gap-2"
            >
              <div className="relative group">
                <button
                  onClick={handleRefreshMetadata}
                  disabled={refreshMetadataMutation.isPending}
                  className="flex relative z-10 gap-2 items-center btn-secondary"
                >
                  <RefreshCw className={`w-4 h-4 ${refreshMetadataMutation.isPending ? 'animate-spin' : ''}`} />
                  Refresh Metadata
                </button>
                <div className="absolute left-0 right-0 top-full -mt-px z-0 bg-dark-700 border border-t-0 border-dark-500  transition-all duration-300 font-mono grid grid-rows-[0fr] group-hover:grid-rows-[1fr]">
                  <div className="overflow-hidden">
                    <button
                      onClick={() => setSkipExisting(!skipExisting)}
                      className="flex gap-1.5 items-center px-4 py-2 text-sm text-gray-400 hover:text-terminal-green transition-colors whitespace-nowrap w-full"
                    >
                      {skipExisting ? (
                        <CheckSquare className="w-4 h-4 text-terminal-green" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                      Skip existing
                    </button>
                  </div>
                </div>
              </div>
              <button
                onClick={handleBatchRemove}
                disabled={removeFromListMutation.isPending}
                className="flex gap-2 items-center btn-secondary"
              >
                <X className="w-4 h-4" />
                Remove {selectedListItemIds.length} from list
              </button>
              <button
                onClick={handleBatchDelete}
                disabled={deleteItemsMutation.isPending}
                className="flex gap-2 items-center btn-secondary"
              >
                <Trash2 className="w-4 h-4" />
                Delete {selectedListItemIds.length}
              </button>
            </motion.div>
          )}
        </div>

        <div className="flex flex-wrap gap-4 items-center font-mono text-sm">
          <div className="flex gap-2 items-center text-gray-400">
            <Calendar className="w-4 h-4" />
            {new Date(list.created_at).toLocaleDateString()}
          </div>
          <div className="flex gap-2 items-center text-gray-400">
            <FileText className="w-4 h-4" />
            {list.total_items} items
          </div>
          <div className={`font-bold ${getStatusColor()}`}>
            {list.status.toUpperCase()}
          </div>

          {/* Manage List Dropdown */}
          <div className="relative ml-auto" ref={menuRef}>
            <button
              onClick={() => setShowManageMenu(!showManageMenu)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-gray-400 hover:text-terminal-green border border-gray-600 hover:border-terminal-green transition-colors"
            >
              <MoreHorizontal className="w-4 h-4" />
              Manage List
            </button>

            <AnimatePresence>
              {showManageMenu && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute right-0 z-50 mt-2 w-56 border shadow-lg bg-dark-800 border-dark-500"
                >
                  <button
                    onClick={handleRename}
                    className="flex gap-3 items-center px-4 py-3 w-full text-left text-gray-300 transition-colors hover:bg-dark-700 hover:text-terminal-green"
                  >
                    <Pencil className="w-4 h-4" />
                    Rename
                  </button>
                  <div className="border-t border-dark-600" />
                  <button
                    onClick={handleDeleteListAndItems}
                    disabled={deleteListWithItemsMutation.isPending}
                    className="flex gap-3 items-center px-4 py-3 w-full text-left text-red-400 transition-colors hover:bg-dark-700 hover:text-red-300 disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete List and Items
                  </button>
                  <button
                    onClick={handleDeleteListKeepItems}
                    disabled={deleteListMutation.isPending}
                    className="flex gap-3 items-center px-4 py-3 w-full text-left text-orange-400 transition-colors hover:bg-dark-700 hover:text-orange-300 disabled:opacity-50"
                  >
                    <X className="w-4 h-4" />
                    Delete List, Keep Items
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Progress Bar - downloading state */}
        {list.status === 'downloading' && (
          <div className="space-y-1">
            <div className="overflow-hidden h-3 border bg-dark-700 border-dark-500">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                className="h-full bg-terminal-green"
              />
            </div>
            <div className="font-mono text-sm text-gray-500">
              {list.completed_items}/{list.total_items} completed ({progress.toFixed(0)}%)
              {list.failed_items > 0 && (
                <span className="ml-2 text-red-500">({list.failed_items} failed)</span>
              )}
            </div>
          </div>
        )}

        {/* Completion summary - partial state */}
        {list.status === 'partial' && (
          <div className="space-y-1">
            <div className="flex overflow-hidden h-3 border bg-dark-700 border-dark-500">
              <div
                style={{ width: `${(list.completed_items / list.total_items) * 100}%` }}
                className="h-full bg-terminal-green"
              />
              <div
                style={{ width: `${(list.failed_items / list.total_items) * 100}%` }}
                className="h-full bg-red-500/60"
              />
            </div>
            <div className="font-mono text-sm text-gray-500">
              <span className="text-terminal-green">{list.completed_items} completed</span>
              <span className="mx-2">·</span>
              <span className="text-red-500">{list.failed_items} failed</span>
              <span className="mx-2">·</span>
              {list.total_items} total
            </div>
          </div>
        )}
      </motion.div>

      {/* Download Button */}
      {(list.status === 'completed' || list.status === 'partial') && list.completed_items > 0 && (
        <motion.a
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          href={api.getListDownloadUrl(list.id)}
          download
          className="flex gap-2 justify-center items-center w-full btn-primary"
        >
          <Download className="w-5 h-5" />
          DOWNLOAD ZIP ({list.completed_items} {list.completed_items === 1 ? 'file' : 'files'})
        </motion.a>
      )}

      {/* Items Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="overflow-x-auto card-terminal"
      >
        <table className="w-full">
          <thead>
            <tr className="border-b border-dark-500">
              <th className="px-4 py-3 font-mono text-sm text-left text-terminal-green">
                <button
                  onClick={handleSelectAll}
                  className="transition-colors text-terminal-green hover:text-terminal-green-dark"
                >
                  {selectedListItemIds.length === selectableItems.length && selectableItems.length > 0 ? (
                    <CheckSquare className="w-5 h-5" />
                  ) : (
                    <Square className="w-5 h-5" />
                  )}
                </button>
              </th>
              <th className="px-4 py-3 font-mono text-sm text-left text-terminal-green">
                #
              </th>
              <th className="px-4 py-3 font-mono text-sm text-left text-terminal-green">
                Track
              </th>
              <th className="px-4 py-3 font-mono text-sm text-left text-terminal-green">
                BPM
              </th>
              <th className="px-4 py-3 font-mono text-sm text-left text-terminal-green">
                Quality
              </th>
              <th className="px-4 py-3 font-mono text-sm text-left text-terminal-green">
                Status
              </th>
              <th className="px-4 py-3 font-mono text-sm text-left text-terminal-green">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => {
              const isDeleted = item.download_status === 'deleted';
              const isFailed = item.download_status === 'failed';
              const isDimmed = isDeleted || isFailed;
              const isSelected = selectedListItemIds.includes(item.id);
              const isCurrentTrack = currentTrack?.id === item.id;
              const isThisPlaying = isCurrentTrack && isPlaying;
              const isCompleted = item.download_status === 'completed';

              // Use metadata if available, fall back to filename
              const title = item.meta_title || item.filename;
              const artist = item.meta_artist;
              const albumArt = item.meta_album_art_url;

              const itemStatusColors: Record<string, string> = {
                pending: 'text-yellow-500',
                downloading: 'text-blue-500',
                completed: 'text-terminal-green',
                failed: 'text-red-500',
                queued: 'text-orange-500',
                deleted: 'text-red-500',
              };
              return (
                <motion.tr
                  key={item.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + index * 0.05 }}
                  className={`border-b border-dark-600 transition-colors ${
                    isDimmed ? 'opacity-40' : 'hover:bg-dark-700'
                  } ${isSelected ? 'bg-dark-700' : ''}`}
                >
                  <td className="px-4 py-3 text-sm">
                    {!isDeleted && (
                      <button
                        onClick={() => toggleListItemSelection(item.id)}
                        className="transition-colors text-terminal-green hover:text-terminal-green-dark"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-5 h-5" />
                        ) : (
                          <Square className="w-5 h-5" />
                        )}
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-sm text-gray-500">
                    {index + 1}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex gap-3 items-center">
                      {/* Cover Art / Play Button */}
                      <div className={`relative flex-shrink-0 w-10 h-10 group ${isDimmed ? 'opacity-50' : ''}`}>
                        <CoverArt
                          itemId={item.id}
                          albumArtUrl={albumArt}
                          size="thumb"
                          alt={title}
                          className="w-full h-full"
                          iconClassName="w-4 h-4 text-gray-500"
                        />
                        {/* Playing indicator (behind play button) */}
                        {isThisPlaying && (
                          <PlayingIndicator size="sm" />
                        )}
                        {/* Play/Pause button overlay (always on top) */}
                        {!isDeleted && isCompleted && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isThisPlaying) {
                                pausePlayback();
                              } else {
                                // Build queue from all completed (non-deleted) items in this list
                                const completedItems = items.filter(i =>
                                  i.download_status === 'completed' && !i.deleted_at
                                );
                                const trackIndex = completedItems.findIndex(i => i.id === item.id);
                                if (trackIndex >= 0) {
                                  playTrackFromQueue(completedItems, trackIndex);
                                }
                              }
                            }}
                            className="flex absolute inset-0 z-10 justify-center items-center rounded opacity-0 transition-opacity bg-black/60 group-hover:opacity-100"
                          >
                            {isThisPlaying ? (
                              <Pause className="w-4 h-4 text-terminal-green" />
                            ) : (
                              <Play className="w-4 h-4 ml-0.5 text-terminal-green" />
                            )}
                          </button>
                        )}
                      </div>

                      {/* Title / Artist */}
                      <div className="flex flex-col min-w-0">
                        {isDimmed ? (
                          <span className={`truncate ${isDeleted ? 'text-gray-500 line-through' : 'text-gray-500'}`} title={title}>
                            {title}
                          </span>
                        ) : (
                          <Link
                            to={`/items/${item.id}`}
                            className="font-medium truncate transition-colors text-terminal-green hover:text-terminal-green-dark hover:underline"
                            title={title}
                          >
                            {title}
                          </Link>
                        )}
                        {artist ? (
                          <span className={`text-xs truncate ${isDimmed ? 'text-gray-600' : 'text-gray-400'}`} title={artist}>
                            {artist}
                          </span>
                        ) : (
                          <span className={`text-xs truncate italic ${isDimmed ? 'text-gray-600' : 'text-gray-500'}`}>
                            Unknown Artist
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className={`px-4 py-3 text-sm font-mono ${isDimmed ? 'text-gray-600' : 'text-gray-400'}`}>
                    {item.meta_bpm || '-'}
                  </td>
                  <td className={`px-4 py-3 text-sm font-mono ${isDimmed ? 'text-gray-600' : 'text-gray-400'}`}>
                    {(() => {
                      const ext = item.extension?.toUpperCase();
                      const lossless = ['FLAC', 'WAV', 'AIFF'].includes(ext);
                      if (lossless) {
                        if (item.bit_depth && item.sample_rate) {
                          return `${item.bit_depth}/${(item.sample_rate / 1000).toFixed(1)}kHz`;
                        }
                        return ext;
                      }
                      return item.bitrate ? `${item.bitrate} kbps` : ext || '-';
                    })()}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span
                      className={`font-mono font-bold ${
                        itemStatusColors[item.download_status]
                      }`}
                    >
                      {item.download_status.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {!isDeleted && (
                      <div className="flex gap-2">
                        {item.download_status === 'completed' && (
                          <a
                            href={api.getItemDownloadUrl(item.id)}
                            download
                            className="px-2 py-1 text-xs btn-secondary"
                            title="Download file"
                          >
                            <Download className="w-3 h-3" />
                          </a>
                        )}
                        {item.download_status === 'failed' && (
                          <button
                            onClick={() => {
                              const track = item.original_track || item.original_query;
                              const artist = item.original_artist || undefined;
                              retryMutation.mutate({ itemId: item.id, track, artist });
                            }}
                            disabled={retryMutation.isPending}
                            className="px-2 py-1 text-xs btn-secondary"
                            title="Retry download"
                          >
                            <RotateCcw className={`w-3 h-3 ${retryMutation.isPending ? 'animate-spin' : ''}`} />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            if (confirm('Remove this item from the list?')) {
                              removeFromListMutation.mutate([item.id]);
                            }
                          }}
                          className="px-2 py-1 text-xs btn-secondary"
                          title="Remove from list"
                        >
                          <X className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('Delete this item? It will be removed from all lists.')) {
                              deleteItemsMutation.mutate([item.id]);
                            }
                          }}
                          className="px-2 py-1 text-xs text-red-500 btn-secondary hover:text-red-400"
                          title="Delete item"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>

        {items.length === 0 && (
          <div className="py-12 font-mono text-center text-gray-500">
            No items in this list
          </div>
        )}
      </motion.div>

      {/* Rename Modal */}
      <AnimatePresence>
        {showRenameModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex fixed inset-0 z-50 justify-center items-center bg-black/70"
            onClick={() => setShowRenameModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="p-6 w-full max-w-md border bg-dark-800 border-dark-500"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="mb-4 text-xl font-bold font-display text-terminal-green">
                Rename List
              </h2>
              <input
                type="text"
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submitRename()}
                className="px-4 py-3 w-full font-mono text-white border bg-dark-900 border-dark-500 focus:border-terminal-green focus:outline-none"
                placeholder="Enter new name..."
                autoFocus
              />
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => setShowRenameModal(false)}
                  className="flex-1 px-4 py-2 font-mono text-gray-400 border border-gray-600 transition-colors hover:border-gray-400"
                >
                  Cancel
                </button>
                <button
                  onClick={submitRename}
                  disabled={!newListName.trim() || newListName === data?.name || renameListMutation.isPending}
                  className="flex-1 px-4 py-2 font-mono font-bold transition-colors bg-terminal-green text-dark-900 hover:bg-terminal-green-dark disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {renameListMutation.isPending ? 'Saving...' : 'Save'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
