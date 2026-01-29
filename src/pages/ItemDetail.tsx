import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Download, ArrowLeft, Clock, HardDrive, Music, User } from 'lucide-react';
import { api } from '../lib/api';

export function ItemDetail() {
  const { id } = useParams<{ id: string }>();

  const { data: item, isLoading } = useQuery({
    queryKey: ['item', id],
    queryFn: () => api.getItem(Number(id)),
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

  if (!item) {
    return (
      <div className="card-terminal text-center py-12">
        <p className="font-mono text-red-500">Item not found</p>
      </div>
    );
  }

  const metadata = [
    { label: 'Filename', value: item.filename, icon: Music },
    { label: 'File Size', value: `${(item.file_size / 1024 / 1024).toFixed(2)} MB`, icon: HardDrive },
    { label: 'Bitrate', value: item.bitrate ? `${item.bitrate} kbps` : 'N/A', icon: Music },
    { label: 'Duration', value: item.duration ? `${Math.floor(item.duration / 60)}:${String(item.duration % 60).padStart(2, '0')}` : 'N/A', icon: Clock },
    { label: 'Source', value: item.source_username, icon: User },
    { label: 'Extension', value: item.extension.toUpperCase(), icon: Music },
    { label: 'Status', value: item.download_status.toUpperCase(), icon: Clock },
    { label: 'Original Query', value: item.original_query, icon: Music },
  ];

  const getStatusColor = () => {
    const colors = {
      pending: 'text-yellow-500',
      downloading: 'text-blue-500',
      completed: 'text-terminal-green',
      failed: 'text-red-500',
    };
    return colors[item.download_status] || 'text-gray-500';
  };

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
        <Link to="/items" className="inline-flex items-center gap-2 text-terminal-green hover:text-terminal-green-dark transition-colors font-mono">
          <ArrowLeft className="w-4 h-4" />
          Back to Items
        </Link>
      </motion.div>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <h1 className="text-4xl font-mono font-bold text-terminal-green break-all">
          {item.filename}
        </h1>
        <div className={`mt-2 font-mono font-bold ${getStatusColor()}`}>
          {item.download_status.toUpperCase()}
        </div>
      </motion.div>

      {/* Metadata Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
      >
        {metadata.map((field, index) => (
          <motion.div
            key={field.label}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 + index * 0.05 }}
            className="card-terminal"
          >
            <div className="flex items-start gap-3">
              <field.icon className="w-5 h-5 text-terminal-green mt-0.5" />
              <div className="flex-1">
                <div className="text-sm font-mono text-gray-500">{field.label}</div>
                <div className="font-mono text-terminal-green mt-1 break-all">
                  {field.value}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Progress Bar */}
      {item.download_status === 'downloading' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-terminal"
        >
          <div className="space-y-2">
            <div className="flex justify-between text-sm font-mono">
              <span className="text-gray-500">Download Progress</span>
              <span className="text-terminal-green">
                {(item.download_progress * 100).toFixed(0)}%
              </span>
            </div>
            <div className="h-2 bg-dark-700 border border-dark-500 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${item.download_progress * 100}%` }}
                className="h-full bg-terminal-green"
              />
            </div>
          </div>
        </motion.div>
      )}

      {/* Error Message */}
      {item.error_message && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-terminal border-red-500"
        >
          <div className="text-red-500 font-mono text-sm">{item.error_message}</div>
        </motion.div>
      )}

      {/* Download Button */}
      {item.download_status === 'completed' && (
        <motion.a
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          href={api.getItemDownloadUrl(item.id)}
          download
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          <Download className="w-5 h-5" />
          DOWNLOAD FILE
        </motion.a>
      )}
    </div>
  );
}
