import { useMemo, useState } from 'react';
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
import { Download, Trash2, Search, CheckSquare, Square } from 'lucide-react';
import { api } from '../lib/api';
import { useAppStore } from '../store';
import { Link } from 'react-router-dom';
import type { Item } from '../types';

const columnHelper = createColumnHelper<Item>();

export function Items() {
  const [globalFilter, setGlobalFilter] = useState('');
  const queryClient = useQueryClient();

  const { selectedItemIds, toggleItemSelection, clearItemSelection } =
    useAppStore();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['items'],
    queryFn: () => api.getItems(),
  });

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
            className="text-terminal-green hover:text-terminal-green-dark transition-colors"
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
            className="text-terminal-green hover:text-terminal-green-dark transition-colors"
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
            className="font-mono text-terminal-green hover:text-terminal-green-dark
                     hover:underline transition-colors"
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
          const colors: Record<string, string> = {
            pending: 'text-yellow-500',
            downloading: 'text-blue-500',
            completed: 'text-terminal-green',
            failed: 'text-red-500',
          };
          return (
            <span className={`font-mono font-bold ${colors[status]}`}>
              {status.toUpperCase()}
            </span>
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
                className="btn-secondary px-3 py-1 text-sm"
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
            Items
          </h1>
          <p className="text-gray-500 text-sm mt-2">
            {items.length} total items
          </p>
        </div>

        {selectedItemIds.length > 0 && (
          <motion.button
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={handleBatchDelete}
            disabled={deleteMutation.isPending}
            className="btn-secondary flex items-center gap-2"
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
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            type="text"
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder="Filter items..."
            className="input-terminal w-full pl-12"
          />
        </div>
      </motion.div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="card-terminal overflow-x-auto"
      >
        <table className="w-full">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b border-dark-500">
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="text-left px-4 py-3 font-mono text-terminal-green text-sm"
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
            {table.getRowModel().rows.map((row, index) => (
              <motion.tr
                key={row.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="border-b border-dark-600 hover:bg-dark-700 transition-colors"
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-3 text-sm">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </motion.tr>
            ))}
          </tbody>
        </table>

        {table.getRowModel().rows.length === 0 && (
          <div className="text-center py-12 text-gray-500 font-mono">
            No items found
          </div>
        )}
      </motion.div>
    </div>
  );
}
