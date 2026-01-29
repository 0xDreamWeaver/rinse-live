import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Download, Trash2, Search, CheckSquare, Square, Calendar, FileText } from 'lucide-react';
import { api } from '../lib/api';
import { useAppStore } from '../store';
import { Link } from 'react-router-dom';

export function Lists() {
  const [searchQuery, setSearchQuery] = useState('');
  const queryClient = useQueryClient();

  const { selectedListIds, toggleListSelection, clearListSelection } =
    useAppStore();

  const { data: lists = [], isLoading } = useQuery({
    queryKey: ['lists'],
    queryFn: () => api.getLists(),
  });

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
      <div className="flex items-center justify-center h-64">
        <div className="font-mono text-terminal-green animate-pulse">
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
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-4xl font-display font-bold text-terminal-green">
            Lists
          </h1>
          <p className="text-gray-500 text-sm mt-2">
            {lists.length} total lists
          </p>
        </div>

        {selectedListIds.length > 0 && (
          <motion.button
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={handleBatchDelete}
            disabled={deleteMutation.isPending}
            className="btn-secondary flex items-center gap-2"
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
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter lists..."
            className="input-terminal w-full pl-12"
          />
        </div>
      </motion.div>

      {/* Lists Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                isSelected ? 'border-terminal-green terminal-box-glow' : ''
              }`}
            >
              {/* Selection Checkbox */}
              <button
                onClick={() => toggleListSelection(list.id)}
                className="absolute top-4 right-4 text-terminal-green hover:text-terminal-green-dark transition-colors"
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
                  <h3 className="text-xl font-display font-bold text-terminal-green">
                    {list.name}
                  </h3>
                  <div className="flex items-center gap-2 text-sm text-gray-500 mt-2">
                    <Calendar className="w-4 h-4" />
                    <span className="font-mono">
                      {new Date(list.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-sm font-mono">
                  <div className="flex items-center gap-2">
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
                    <div className="h-2 bg-dark-700 border border-dark-500 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        className="h-full bg-terminal-green"
                      />
                    </div>
                    <div className="text-xs font-mono text-gray-500 text-right">
                      {list.completed_items}/{list.total_items} (
                      {progress.toFixed(0)}%)
                    </div>
                  </div>
                ) : null}

                {/* Stats */}
                <div className="flex gap-4 text-xs font-mono">
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
                  className="btn-primary w-full mt-4 flex items-center justify-center gap-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Download className="w-4 h-4" />
                  DOWNLOAD ZIP
                </a>
              )}
            </motion.div>
          );
        })}
      </div>

      {filteredLists.length === 0 && (
        <div className="card-terminal text-center py-12 text-gray-500 font-mono">
          No lists found
        </div>
      )}
    </div>
  );
}
