import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from '../lib/api';
import type { SearchHistoryEntry } from '../types';
import { formatDistanceToNow } from 'date-fns';

const ITEMS_PER_PAGE = 25;

const statusColors: Record<string, string> = {
  completed: 'text-terminal-green',
  failed: 'text-red-500',
  processing: 'text-blue-500',
  pending: 'text-yellow-500',
};

export function SearchHistory() {
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['searchHistory', page],
    queryFn: () => api.getSearchHistory(ITEMS_PER_PAGE, page * ITEMS_PER_PAGE),
    refetchInterval: 10000,
  });

  const entries = data?.entries || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  const filteredEntries = filter
    ? entries.filter(entry =>
        entry.query.toLowerCase().includes(filter.toLowerCase()) ||
        entry.username.toLowerCase().includes(filter.toLowerCase()) ||
        (entry.original_artist?.toLowerCase().includes(filter.toLowerCase())) ||
        (entry.original_track?.toLowerCase().includes(filter.toLowerCase()))
      )
    : entries;

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
              History
            </h1>
            <span className="font-mono text-2xl font-bold text-gray-500">
              [
                <span className="text-gray-200">
                  {total.toLocaleString()}
                </span>
              ]
            </span>
          </div>
          <p className="mt-2 text-sm text-gray-500">
            View past searches and their results
          </p>
        </div>
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
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter history..."
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
            <tr className="border-b border-dark-500">
              <th className="px-4 py-3 font-mono text-sm text-left text-terminal-green">
                Track
              </th>
              <th className="px-4 py-3 font-mono text-sm text-left text-terminal-green">
                Status
              </th>
              <th className="px-4 py-3 font-mono text-sm text-left text-terminal-green">
                Time
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredEntries.map((entry, index) => (
              <HistoryRow key={entry.id} entry={entry} index={index} />
            ))}
          </tbody>
        </table>

        {filteredEntries.length === 0 && (
          <div className="py-12 font-mono text-center text-gray-500">
            {filter ? 'No matches found' : 'No search history yet'}
          </div>
        )}
      </motion.div>

      {/* Pagination */}
      {totalPages > 1 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex gap-4 justify-center items-center"
        >
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            className="p-2 transition-colors border bg-dark-700 border-dark-500 hover:border-terminal-green hover:text-terminal-green disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-5 h-5 text-gray-400" />
          </button>
          <span className="font-mono text-sm text-gray-400">
            Page {page + 1} of {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="p-2 transition-colors border bg-dark-700 border-dark-500 hover:border-terminal-green hover:text-terminal-green disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>
        </motion.div>
      )}
    </div>
  );
}

function HistoryRow({ entry, index }: { entry: SearchHistoryEntry; index: number }) {
  const isFailed = entry.status === 'failed';
  const title = entry.original_track || entry.query;
  const artist = entry.original_artist;

  return (
    <motion.tr
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03 }}
      className={`border-b transition-colors border-dark-600 hover:bg-dark-700 ${isFailed ? 'opacity-50' : ''}`}
    >
      {/* Track */}
      <td className="px-4 py-3 text-sm">
        <div className="flex flex-col min-w-0">
          <span className="font-medium truncate text-gray-200" title={title}>
            {title}
          </span>
          {artist ? (
            <span className="text-xs text-gray-400 truncate" title={artist}>
              {artist}
            </span>
          ) : (
            <span className="text-xs text-gray-500 truncate italic">
              {entry.query}
            </span>
          )}
          {isFailed && entry.error_message && (
            <span className="text-xs text-red-500 truncate mt-0.5" title={entry.error_message}>
              {entry.error_message}
            </span>
          )}
        </div>
      </td>

      {/* Status */}
      <td className="px-4 py-3 text-sm">
        <span className={`font-mono font-bold ${statusColors[entry.status] || 'text-gray-400'}`}>
          {entry.status.toUpperCase()}
        </span>
      </td>

      {/* Time */}
      <td className="px-4 py-3 text-sm">
        <span className="font-mono text-gray-500">
          {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
        </span>
      </td>
    </motion.tr>
  );
}
