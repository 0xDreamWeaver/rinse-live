import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, CheckCircle2, XCircle, Clock, Download, X, ChevronUp, ChevronDown } from 'lucide-react';
import { api } from '../lib/api';
import { useAppStore, useAudioPlayer } from '../store';
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
        borderColor: 'border-blue-500/50',
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
        borderColor: 'border-purple-500/50',
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
        borderColor: 'border-blue-500/50',
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
        borderColor: 'border-terminal-green/50',
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
        borderColor: 'border-terminal-green/50',
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
        borderColor: 'border-red-500/50',
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
        borderColor: 'border-yellow-500/50',
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
        borderColor: 'border-cyan-500/50',
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
        borderColor: 'border-gray-500/50',
        bgColor: 'bg-gray-500/10',
        canDismiss: false,
      };
  }
}

interface ToastProps {
  download: ActiveDownload;
  onDismiss: () => void;
  isCompact: boolean;
}

function Toast({ download, onDismiss, isCompact }: ToastProps) {
  const info = getStageInfo(download);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 50, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 50, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className={`relative overflow-hidden rounded-lg border ${info.borderColor} ${info.bgColor} backdrop-blur-sm shadow-lg`}
    >
      <div className={`p-3 ${isCompact ? 'py-2' : ''}`}>
        <div className="flex items-start gap-3">
          <div className={`flex-shrink-0 mt-0.5 ${info.color}`}>
            {info.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className={`font-mono text-sm font-medium ${info.color}`}>
                {info.title}
              </span>
              {info.canDismiss && (
                <button
                  onClick={onDismiss}
                  className="flex-shrink-0 p-0.5 text-gray-500 hover:text-gray-300 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            {!isCompact && (
              <>
                <div className="font-mono text-xs text-gray-300 truncate max-w-[200px]">
                  {info.subtitle}
                </div>
                <div className="font-mono text-xs text-gray-500 truncate">
                  {info.detail}
                </div>
              </>
            )}
          </div>
          {info.showDownload && download.itemId > 0 && !isCompact && (
            <a
              href={api.getItemDownloadUrl(download.itemId)}
              download
              className="flex-shrink-0 px-2 py-1 text-xs font-mono bg-terminal-green/20 text-terminal-green rounded hover:bg-terminal-green/30 transition-colors"
            >
              Save
            </a>
          )}
        </div>
      </div>
      {/* Progress bar */}
      {info.progress !== undefined && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-dark-700">
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

export function DownloadToasts() {
  const [isExpanded, setIsExpanded] = useState(true);
  const { activeDownloads, dismissActiveDownload } = useAppStore();
  const { currentTrack } = useAudioPlayer();

  // Adjust bottom position when media player is active
  const bottomOffset = currentTrack ? 'bottom-[88px]' : 'bottom-4';

  // Sort downloads: active (searching/processing/downloading) first, then by creation time
  const sortedDownloads = Array.from(activeDownloads.values())
    .sort((a, b) => {
      const activeStages = ['searching', 'processing', 'selecting', 'downloading'];
      const aActive = activeStages.includes(a.stage);
      const bActive = activeStages.includes(b.stage);
      if (aActive && !bActive) return -1;
      if (!aActive && bActive) return 1;
      return b.createdAt - a.createdAt;
    });

  if (sortedDownloads.length === 0) return null;

  const activeCount = sortedDownloads.filter(d =>
    ['searching', 'processing', 'selecting', 'downloading'].includes(d.stage)
  ).length;
  const completedCount = sortedDownloads.filter(d =>
    ['completed', 'duplicate'].includes(d.stage)
  ).length;
  const failedCount = sortedDownloads.filter(d => d.stage === 'failed').length;

  // Limit visible toasts when collapsed
  const visibleDownloads = isExpanded ? sortedDownloads : sortedDownloads.slice(0, 3);
  const hiddenCount = sortedDownloads.length - visibleDownloads.length;

  return (
    <div className={`fixed ${bottomOffset} right-4 z-50 flex flex-col items-end gap-2 max-h-[60vh] overflow-hidden pointer-events-none transition-all duration-300`}>
      {/* Header with counts and expand toggle */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="pointer-events-auto flex items-center gap-3 px-3 py-2 rounded-lg bg-dark-800/90 backdrop-blur-sm border border-dark-500 shadow-lg"
      >
        <div className="flex items-center gap-2 font-mono text-xs">
          {activeCount > 0 && (
            <span className="flex items-center gap-1 text-blue-400">
              <Loader2 className="w-3 h-3 animate-spin" />
              {activeCount}
            </span>
          )}
          {completedCount > 0 && (
            <span className="flex items-center gap-1 text-terminal-green">
              <CheckCircle2 className="w-3 h-3" />
              {completedCount}
            </span>
          )}
          {failedCount > 0 && (
            <span className="flex items-center gap-1 text-red-400">
              <XCircle className="w-3 h-3" />
              {failedCount}
            </span>
          )}
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1 text-gray-400 hover:text-gray-200 transition-colors"
          title={isExpanded ? 'Collapse' : 'Expand'}
        >
          {isExpanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronUp className="w-4 h-4" />
          )}
        </button>
      </motion.div>

      {/* Toast stack */}
      <div className="flex flex-col gap-2 pointer-events-auto overflow-y-auto max-h-[calc(70vh-60px)] pr-1 w-72">
        <AnimatePresence mode="popLayout">
          {visibleDownloads.map((download) => (
            <Toast
              key={download.trackingId}
              download={download}
              onDismiss={() => dismissActiveDownload(download.trackingId)}
              isCompact={!isExpanded}
            />
          ))}
        </AnimatePresence>

        {/* Show "more" indicator when collapsed */}
        {hiddenCount > 0 && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={() => setIsExpanded(true)}
            className="px-3 py-2 font-mono text-xs text-gray-400 bg-dark-700/50 rounded-lg border border-dark-500 hover:text-gray-200 hover:bg-dark-600/50 transition-colors"
          >
            +{hiddenCount} more...
          </motion.button>
        )}
      </div>
    </div>
  );
}
