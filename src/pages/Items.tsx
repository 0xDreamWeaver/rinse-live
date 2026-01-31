import { useMemo, useState, useEffect } from 'react';
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
import { Download, Trash2, Search, CheckSquare, Square, Loader2 } from 'lucide-react';
import { api } from '../lib/api';
import { useAppStore } from '../store';
import { Link } from 'react-router-dom';
import type { Item } from '../types';

const columnHelper = createColumnHelper<Item>();

export function Items() {
  const [globalFilter, setGlobalFilter] = useState('');
  const queryClient = useQueryClient();

  const { selectedItemIds, toggleItemSelection, clearItemSelection, itemsNeedRefresh, setItemsNeedRefresh, activeDownloads, progressUpdates } =
    useAppStore();

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
    const download = activeDownloads.get(itemId);
    if (download?.stage === 'downloading') {
      return download.progressPct || 0;
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
      columnHelper.accessor('filename', {
        header: 'Filename',
        cell: (info) => (
          <Link
            to={`/items/${info.row.original.id}`}
            className="font-mono transition-colors text-terminal-green hover:text-terminal-green-dark hover:underline"
          >
            {info.getValue()}
          </Link>
        ),
      }),
      columnHelper.accessor('file_size', {
        header: 'Size',
        cell: (info) => (
          <span className="font-mono text-gray-400">
            {(info.getValue() / 1024 / 1024).toFixed(2)} MB
          </span>
        ),
      }),
      columnHelper.accessor('bitrate', {
        header: 'Bitrate',
        cell: (info) => (
          <span className="font-mono text-gray-400">
            {info.getValue() ? `${info.getValue()} kbps` : '-'}
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
              >
                <Download className="w-4 h-4" />
              </a>
            )}
          </div>
        ),
      }),
    ],
    [items, selectedItemIds, toggleItemSelection, clearItemSelection]
  );

  const table = useReactTable({
    data: items,
    columns,
    state: {
      globalFilter,
    },
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const handleBatchDelete = () => {
    if (selectedItemIds.length > 0 && confirm(`Delete ${selectedItemIds.length} items?`)) {
      deleteMutation.mutate(selectedItemIds);
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
          <motion.button
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={handleBatchDelete}
            disabled={deleteMutation.isPending}
            className="flex gap-2 items-center btn-secondary"
          >
            <Trash2 className="w-4 h-4" />
            Delete {selectedItemIds.length}
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
