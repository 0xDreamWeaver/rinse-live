import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { History, Search, CheckCircle, XCircle, Clock, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from '../lib/api';
import { getUsernameColor } from '../lib/colors';
import type { SearchHistoryEntry } from '../types';
import { formatDistanceToNow } from 'date-fns';

const ITEMS_PER_PAGE = 25;

function StatusBadge({ status }: { status: SearchHistoryEntry['status'] }) {
  switch (status) {
    case 'completed':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded bg-green-500/20 text-green-400">
          <CheckCircle className="w-3 h-3" />
          Completed
        </span>
      );
    case 'failed':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded bg-red-500/20 text-red-400">
          <XCircle className="w-3 h-3" />
          Failed
        </span>
      );
    case 'processing':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded bg-blue-500/20 text-blue-400">
          <Loader2 className="w-3 h-3 animate-spin" />
          Processing
        </span>
      );
    case 'pending':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded bg-yellow-500/20 text-yellow-400">
          <Clock className="w-3 h-3" />
          Pending
        </span>
      );
    default:
      return null;
  }
}

export function SearchHistory() {
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['searchHistory', page],
    queryFn: () => api.getSearchHistory(ITEMS_PER_PAGE, page * ITEMS_PER_PAGE),
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  const entries = data?.entries || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  // Filter entries by search term
  const filteredEntries = filter
    ? entries.filter(entry =>
        entry.query.toLowerCase().includes(filter.toLowerCase()) ||
        entry.username.toLowerCase().includes(filter.toLowerCase()) ||
        (entry.original_artist?.toLowerCase().includes(filter.toLowerCase())) ||
        (entry.original_track?.toLowerCase().includes(filter.toLowerCase()))
      )
    : entries;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <History className="w-6 h-6 text-terminal-green" />
          <h1 className="font-mono text-2xl text-terminal-green">Search History</h1>
        </div>
        <div className="text-sm text-gray-500">
          {total.toLocaleString()} total searches
        </div>
      </div>

      {/* Search filter */}
      <div className="relative mb-6">
        <Search className="absolute w-4 h-4 text-gray-500 transform -translate-y-1/2 left-3 top-1/2" />
        <input
          type="text"
          placeholder="Filter by query or username..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-full py-2 pl-10 pr-4 font-mono text-sm border rounded-lg bg-dark-700 border-dark-500 text-terminal-green placeholder:text-gray-500 focus:outline-none focus:border-terminal-green"
        />
      </div>

      {/* History list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-terminal-green" />
        </div>
      ) : filteredEntries.length === 0 ? (
        <div className="py-12 text-center text-gray-500">
          {filter ? 'No matches found' : 'No search history yet'}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredEntries.map((entry) => (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="p-4 transition-colors border rounded-lg bg-dark-700 border-dark-500 hover:border-dark-400"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  {/* Query / Track info */}
                  <div className="flex items-center gap-2 mb-1">
                    {entry.original_artist && entry.original_track ? (
                      <span className="font-mono text-sm truncate text-terminal-green">
                        <span className="text-gray-400">{entry.original_artist}</span>
                        {' - '}
                        {entry.original_track}
                      </span>
                    ) : (
                      <span className="font-mono text-sm truncate text-terminal-green">
                        {entry.query}
                      </span>
                    )}
                  </div>

                  {/* Username and time */}
                  <div className="flex items-center gap-3 text-xs">
                    <span
                      className="font-medium"
                      style={{ color: getUsernameColor(entry.username) }}
                    >
                      {entry.username}
                    </span>
                    <span className="text-gray-500">
                      {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
                    </span>
                  </div>

                  {/* Error message if failed */}
                  {entry.status === 'failed' && entry.error_message && (
                    <div className="mt-2 text-xs text-red-400 truncate">
                      {entry.error_message}
                    </div>
                  )}
                </div>

                {/* Status badge */}
                <div className="flex-shrink-0">
                  <StatusBadge status={entry.status} />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-6">
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            className="p-2 transition-colors rounded-lg bg-dark-700 hover:bg-dark-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-5 h-5 text-gray-400" />
          </button>
          <span className="font-mono text-sm text-gray-400">
            Page {page + 1} of {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="p-2 transition-colors rounded-lg bg-dark-700 hover:bg-dark-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>
        </div>
      )}
    </motion.div>
  );
}
