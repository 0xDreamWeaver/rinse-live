import { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Download, ArrowLeft, Calendar, FileText, Trash2, X, CheckSquare, Square, Play, Pause } from 'lucide-react';
import { api } from '../lib/api';
import { useAppStore, useAudioPlayer } from '../store';

export function ListDetail() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const {
    listsNeedRefresh,
    setListsNeedRefresh,
    selectedListItemIds,
    toggleListItemSelection,
    clearListItemSelection,
    setSelectedListItemIds
  } = useAppStore();
  const { currentTrack, isPlaying, playTrack, pausePlayback } = useAudioPlayer();

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="font-mono text-terminal-green animate-pulse">
          LOADING...
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="card-terminal text-center py-12">
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
        <Link to="/lists" className="inline-flex items-center gap-2 text-terminal-green hover:text-terminal-green-dark transition-colors font-mono">
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
        <h1 className="text-4xl font-display font-bold text-terminal-green">
          {list.name}
        </h1>

        <div className="flex flex-wrap gap-4 text-sm font-mono">
          <div className="flex items-center gap-2 text-gray-400">
            <Calendar className="w-4 h-4" />
            {new Date(list.created_at).toLocaleDateString()}
          </div>
          <div className="flex items-center gap-2 text-gray-400">
            <FileText className="w-4 h-4" />
            {list.total_items} items
          </div>
          <div className={`font-bold ${getStatusColor()}`}>
            {list.status.toUpperCase()}
          </div>
        </div>

        {/* Progress Bar */}
        {(list.status === 'downloading' || list.status === 'partial') && (
          <div className="space-y-1">
            <div className="h-3 bg-dark-700 border border-dark-500 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                className="h-full bg-terminal-green"
              />
            </div>
            <div className="text-sm font-mono text-gray-500">
              {list.completed_items}/{list.total_items} completed ({progress.toFixed(0)}%)
              {list.failed_items > 0 && (
                <span className="text-red-500 ml-2">({list.failed_items} failed)</span>
              )}
            </div>
          </div>
        )}
      </motion.div>

      {/* Download Button */}
      {list.status === 'completed' && (
        <motion.a
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          href={api.getListDownloadUrl(list.id)}
          download
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          <Download className="w-5 h-5" />
          DOWNLOAD ZIP ({list.total_items} files)
        </motion.a>
      )}

      {/* Batch Action Buttons */}
      {selectedListItemIds.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex gap-3"
        >
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
            className="flex gap-2 items-center btn-secondary text-red-500 hover:text-red-400"
          >
            <Trash2 className="w-4 h-4" />
            Delete {selectedListItemIds.length}
          </button>
        </motion.div>
      )}

      {/* Items Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="card-terminal overflow-x-auto"
      >
        <table className="w-full">
          <thead>
            <tr className="border-b border-dark-500">
              <th className="text-left px-4 py-3 font-mono text-terminal-green text-sm">
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
              <th className="text-left px-4 py-3 font-mono text-terminal-green text-sm">
                #
              </th>
              <th className="text-left px-4 py-3 font-mono text-terminal-green text-sm">
                Filename
              </th>
              <th className="text-left px-4 py-3 font-mono text-terminal-green text-sm">
                Size
              </th>
              <th className="text-left px-4 py-3 font-mono text-terminal-green text-sm">
                Status
              </th>
              <th className="text-left px-4 py-3 font-mono text-terminal-green text-sm">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => {
              const isDeleted = item.download_status === 'deleted';
              const isSelected = selectedListItemIds.includes(item.id);
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
                    isDeleted ? 'opacity-50' : 'hover:bg-dark-700'
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
                  <td className="px-4 py-3 text-sm font-mono text-gray-500">
                    {index + 1}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex items-center gap-3">
                      {!isDeleted && item.download_status === 'completed' ? (
                        <button
                          onClick={() => {
                            const isCurrentTrack = currentTrack?.id === item.id;
                            const isThisPlaying = isCurrentTrack && isPlaying;
                            if (isThisPlaying) {
                              pausePlayback();
                            } else {
                              playTrack(item);
                            }
                          }}
                          className="flex-shrink-0 flex items-center justify-center w-8 h-8 transition-colors rounded-full bg-terminal-green hover:bg-terminal-green-dark"
                        >
                          {currentTrack?.id === item.id && isPlaying ? (
                            <Pause className="w-4 h-4 text-dark-900" />
                          ) : (
                            <Play className="w-4 h-4 ml-0.5 text-dark-900" />
                          )}
                        </button>
                      ) : (
                        <div className="w-8 h-8 flex-shrink-0" />
                      )}
                      {isDeleted ? (
                        <span className="font-mono text-gray-500 line-through">
                          {item.filename}
                        </span>
                      ) : (
                        <Link
                          to={`/items/${item.id}`}
                          className="font-mono text-terminal-green hover:text-terminal-green-dark hover:underline"
                        >
                          {item.filename}
                        </Link>
                      )}
                    </div>
                  </td>
                  <td className={`px-4 py-3 text-sm font-mono ${isDeleted ? 'text-gray-600' : 'text-gray-400'}`}>
                    {(item.file_size / 1024 / 1024).toFixed(2)} MB
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
                          className="px-2 py-1 text-xs btn-secondary text-red-500 hover:text-red-400"
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
          <div className="text-center py-12 text-gray-500 font-mono">
            No items in this list
          </div>
        )}
      </motion.div>
    </div>
  );
}
