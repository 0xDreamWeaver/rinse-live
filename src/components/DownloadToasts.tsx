import { motion, AnimatePresence } from 'framer-motion';
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Download,
  X,
  ListMusic,
} from 'lucide-react';
import { api } from '../lib/api';
import type { ActiveDownload } from '../types';

function getStageInfo(download: ActiveDownload) {
  switch (download.stage) {
    case 'searching':
      return {
        icon: <Loader2 className="w-4 h-4 animate-spin" />,
        title: 'Searching...',
        subtitle: download.query,
        detail: download.resultsCount !== undefined
          ? `${download.resultsCount} files from ${download.usersCount || 0} users`
          : 'Querying network...',
        color: 'text-blue-400',
        bgColor: 'bg-blue-500/10',
        canDismiss: false,
      };
    case 'processing':
      return {
        icon: <Loader2 className="w-4 h-4 animate-spin" />,
        title: 'Processing...',
        subtitle: download.query,
        detail: 'Executing search...',
        color: 'text-purple-400',
        bgColor: 'bg-purple-500/10',
        canDismiss: false,
      };
    case 'selecting':
      return {
        icon: <Loader2 className="w-4 h-4 animate-spin" />,
        title: 'Selecting file',
        subtitle: download.query,
        detail: download.selectedFile
          ? `${download.selectedFile}`
          : `Found ${download.resultsCount || 0} results`,
        color: 'text-blue-400',
        bgColor: 'bg-blue-500/10',
        canDismiss: false,
      };
    case 'downloading':
      return {
        icon: <Download className="w-4 h-4" />,
        title: 'Downloading',
        subtitle: download.filename || download.query,
        detail: download.progressPct !== undefined
          ? `${download.progressPct.toFixed(0)}% - ${(download.speedKbps || 0).toFixed(0)} KB/s`
          : 'Starting...',
        color: 'text-terminal-green',
        bgColor: 'bg-terminal-green/10',
        progress: download.progressPct,
        canDismiss: false,
      };
    case 'completed':
      return {
        icon: <CheckCircle2 className="w-4 h-4" />,
        title: 'Complete',
        subtitle: download.filename || download.query,
        detail: 'Download finished',
        color: 'text-terminal-green',
        bgColor: 'bg-terminal-green/10',
        showDownload: true,
        canDismiss: true,
      };
    case 'failed':
      return {
        icon: <XCircle className="w-4 h-4" />,
        title: 'Failed',
        subtitle: download.query,
        detail: download.error || 'Unknown error',
        color: 'text-red-400',
        bgColor: 'bg-red-500/10',
        canDismiss: true,
      };
    case 'queued':
      return {
        icon: <Clock className="w-4 h-4" />,
        title: 'Queued',
        subtitle: download.query,
        detail: 'Waiting for peer...',
        color: 'text-yellow-400',
        bgColor: 'bg-yellow-500/10',
        canDismiss: false,
      };
    case 'duplicate':
      return {
        icon: <CheckCircle2 className="w-4 h-4" />,
        title: 'Already exists',
        subtitle: download.filename || download.query,
        detail: 'File in library',
        color: 'text-cyan-400',
        bgColor: 'bg-cyan-500/10',
        canDismiss: true,
      };
    default:
      return {
        icon: <Loader2 className="w-4 h-4 animate-spin" />,
        title: 'Processing',
        subtitle: download.query,
        detail: '',
        color: 'text-gray-400',
        bgColor: 'bg-gray-500/10',
        canDismiss: false,
      };
  }
}

interface QueueItemProps {
  download: ActiveDownload;
  onDismiss: () => void;
}

function QueueItem({ download, onDismiss }: QueueItemProps) {
  const info = getStageInfo(download);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className="relative overflow-hidden"
    >
      <div className="flex items-center gap-3 px-3 py-2.5">
        {/* Left: stage icon */}
        <div className={`flex-shrink-0 ${info.color}`}>
          {info.icon}
        </div>

        {/* Center: title + detail */}
        <div className="flex-1 min-w-0">
          <div className="font-mono text-xs text-gray-200 truncate">
            {info.subtitle}
          </div>
          <div className="font-mono text-[11px] text-gray-500 truncate">
            <span className={info.color}>{info.title}</span>
            {info.detail && <> &middot; {info.detail}</>}
          </div>
        </div>

        {/* Right: save link or dismiss button */}
        {info.showDownload && download.itemId > 0 && (
          <a
            href={api.getItemDownloadUrl(download.itemId)}
            download
            className="flex-shrink-0 px-2 py-0.5 text-[11px] font-mono bg-terminal-green/20 text-terminal-green rounded hover:bg-terminal-green/30 transition-colors"
          >
            Save
          </a>
        )}
        {info.canDismiss && (
          <button
            onClick={onDismiss}
            className="flex-shrink-0 p-0.5 text-gray-600 hover:text-gray-300 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Bottom progress bar for downloading items */}
      {info.progress !== undefined && (
        <div className="h-0.5 bg-dark-500">
          <motion.div
            className="h-full bg-terminal-green"
            initial={{ width: 0 }}
            animate={{ width: `${info.progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      )}
    </motion.div>
  );
}

/** Pure content component for the queue panel — rendered by RightDrawers */
export function QueuePanelContent({
  sortedDownloads,
  onDismiss,
}: {
  sortedDownloads: ActiveDownload[];
  onDismiss: (trackingId: string) => void;
}) {
  return (
    <div className="flex-1 overflow-y-auto">
      {sortedDownloads.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-gray-600 font-mono text-xs gap-2">
          <ListMusic className="w-6 h-6" />
          <span>Queue is empty</span>
        </div>
      ) : (
        <div className="divide-y divide-dark-600/50">
          <AnimatePresence mode="popLayout">
            {sortedDownloads.map((download) => (
              <QueueItem
                key={download.trackingId}
                download={download}
                onDismiss={() => onDismiss(download.trackingId)}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
