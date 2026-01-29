import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Download, ArrowLeft, Calendar, FileText } from 'lucide-react';
import { api } from '../lib/api';

export function ListDetail() {
  const { id } = useParams<{ id: string }>();

  const { data, isLoading } = useQuery({
    queryKey: ['list', id],
    queryFn: () => api.getList(Number(id)),
    enabled: !!id,
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

  const { list, items } = data;

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
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => {
              const itemStatusColors = {
                pending: 'text-yellow-500',
                downloading: 'text-blue-500',
                completed: 'text-terminal-green',
                failed: 'text-red-500',
              };
              return (
                <motion.tr
                  key={item.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + index * 0.05 }}
                  className="border-b border-dark-600 hover:bg-dark-700 transition-colors"
                >
                  <td className="px-4 py-3 text-sm font-mono text-gray-500">
                    {index + 1}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <Link
                      to={`/items/${item.id}`}
                      className="font-mono text-terminal-green hover:text-terminal-green-dark hover:underline"
                    >
                      {item.filename}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm font-mono text-gray-400">
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
