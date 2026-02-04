import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Download, Trash2, Search, CheckSquare, Square, Calendar, FileText } from 'lucide-react';
import { api } from '../lib/api';
import { useAppStore } from '../store';
import { Link } from 'react-router-dom';

export function Lists() {
  const [searchQuery, setSearchQuery] = useState('');
  const queryClient = useQueryClient();

  const { selectedListIds, toggleListSelection, clearListSelection, listsNeedRefresh, setListsNeedRefresh } =
    useAppStore();

  const { data: lists = [], isLoading } = useQuery({
    queryKey: ['lists'],
    queryFn: () => api.getLists(),
  });

  // Auto-refresh when WebSocket indicates lists changed
  useEffect(() => {
    if (listsNeedRefresh) {
      queryClient.invalidateQueries({ queryKey: ['lists'] });
      setListsNeedRefresh(false);
    }
  }, [listsNeedRefresh, queryClient, setListsNeedRefresh]);

  const deleteMutation = useMutation({
    mutationFn: (ids: number[]) => api.batchDeleteLists(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lists'] });
      clearListSelection();
    },
  });

  const filteredLists = lists.filter(
    (list) =>
      list.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      list.status.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleBatchDelete = () => {
    if (
      selectedListIds.length > 0 &&
      confirm(`Delete ${selectedListIds.length} lists?`)
    ) {
      deleteMutation.mutate(selectedListIds);
    }
  };

  const getStatusColor = (status: string) => {
    const colors = {
      pending: 'text-yellow-500',
      downloading: 'text-blue-500',
      completed: 'text-terminal-green',
      partial: 'text-orange-500',
      failed: 'text-red-500',
    };
    return colors[status as keyof typeof colors] || 'text-gray-500';
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
              Lists
            </h1>
            <span className="font-mono text-2xl font-bold text-gray-500">
              [
                <span className="text-gray-200">
                  {lists.length}
                </span>
              ]
            </span>
          </div>
          <p className="mt-2 text-sm text-gray-500">
            View and manage your track lists
          </p>
        </div>

        {selectedListIds.length > 0 && (
          <motion.button
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={handleBatchDelete}
            disabled={deleteMutation.isPending}
            className="flex gap-2 items-center btn-secondary"
          >
            <Trash2 className="w-4 h-4" />
            Delete {selectedListIds.length}
          </motion.button>
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
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter lists..."
            className="pl-12 w-full input-terminal"
          />
        </div>
      </motion.div>

      {/* Lists Grid */}
      {filteredLists.length > 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"
        >
          {filteredLists.map((list, index) => {
            const progress =
              list.total_items > 0
                ? (list.completed_items / list.total_items) * 100
                : 0;
            const isSelected = selectedListIds.includes(list.id);

            return (
              <motion.div
                key={list.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                className={`card-terminal relative ${
                  isSelected ? 'border-terminal-green terminal-box-glow' : ''}`}
              >
                {/* Selection Checkbox */}
                <button
                  onClick={() => toggleListSelection(list.id)}
                  className="absolute top-6 right-6 transition-colors text-terminal-green hover:text-terminal-green-dark"
                >
                  {isSelected ? (
                    <CheckSquare className="w-5 h-5" />
                  ) : (
                    <Square className="w-5 h-5" />
                  )}
                </button>

                {/* List Info */}
                <Link to={`/lists/${list.id}`} className="block space-y-4">
                  <div>
                    <h3 className="text-xl font-bold font-display text-terminal-green">
                      {list.name}
                    </h3>
                    <div className="flex gap-2 items-center mt-2 text-sm text-gray-500">
                      <Calendar className="w-4 h-4" />
                      <span className="font-mono">
                        {new Date(list.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-4 items-center font-mono text-sm">
                    <div className="flex gap-2 items-center">
                      <FileText className="w-4 h-4 text-gray-500" />
                      <span className="text-gray-400">
                        {list.total_items} items
                      </span>
                    </div>
                    <div className={`font-bold ${getStatusColor(list.status)}`}>
                      {list.status.toUpperCase()}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  {list.status === 'downloading' || list.status === 'partial' ? (
                    <div className="space-y-1">
                      <div className="overflow-hidden h-2 border bg-dark-700 border-dark-500">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${progress}%` }}
                          className="h-full bg-terminal-green"
                        />
                      </div>
                      <div className="font-mono text-xs text-right text-gray-500">
                        {list.completed_items}/{list.total_items} (
                        {progress.toFixed(0)}%)
                      </div>
                    </div>
                  ) : null}

                  {/* Stats */}
                  <div className="flex gap-4 font-mono text-xs">
                    <div className="text-terminal-green">
                      ✓ {list.completed_items}
                    </div>
                    {list.failed_items > 0 && (
                      <div className="text-red-500">✗ {list.failed_items}</div>
                    )}
                  </div>
                </Link>

                {/* Download Button */}
                {list.status === 'completed' && (
                  <a
                    href={api.getListDownloadUrl(list.id)}
                    download
                    className="flex gap-2 justify-center items-center mt-4 w-full btn-primary"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Download className="w-4 h-4" />
                    DOWNLOAD ZIP
                  </a>
                )}
              </motion.div>
            );
          })}
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="py-12 font-mono text-center text-gray-500 card-terminal"
        >
          No lists found
        </motion.div>
      )}
    </div>
  );
}
