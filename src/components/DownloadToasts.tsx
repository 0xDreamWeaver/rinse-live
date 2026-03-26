import { useState, useEffect, useRef, useCallback } from 'react';
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
import { useAppStore } from '../store';
import { useShallow } from 'zustand/react/shallow';
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

export function QueueSidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const prevCountRef = useRef(0);
  const [hasNewItems, setHasNewItems] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  const { activeDownloads, dismissActiveDownload, currentTrack } = useAppStore(
    useShallow((state) => ({
      activeDownloads: state.activeDownloads,
      dismissActiveDownload: state.dismissActiveDownload,
      currentTrack: state.currentTrack,
    }))
  );

  const bottomOffset = currentTrack ? 'bottom-[72px]' : 'bottom-0';

  // Sort downloads: active first, then by creation time
  const sortedDownloads = Array.from(activeDownloads.values()).sort((a, b) => {
    const activeStages = ['searching', 'processing', 'selecting', 'downloading'];
    const aActive = activeStages.includes(a.stage);
    const bActive = activeStages.includes(b.stage);
    if (aActive && !bActive) return -1;
    if (!aActive && bActive) return 1;
    return b.createdAt - a.createdAt;
  });

  const totalCount = sortedDownloads.length;
  const activeCount = sortedDownloads.filter((d) =>
    ['searching', 'processing', 'selecting', 'downloading'].includes(d.stage)
  ).length;
  const completedCount = sortedDownloads.filter((d) =>
    ['completed', 'duplicate'].includes(d.stage)
  ).length;
  const failedCount = sortedDownloads.filter((d) => d.stage === 'failed').length;
  const inactiveCount = completedCount + failedCount;

  const clearInactive = useCallback(() => {
    for (const d of sortedDownloads) {
      if (['completed', 'failed', 'duplicate'].includes(d.stage)) {
        dismissActiveDownload(d.trackingId);
      }
    }
  }, [sortedDownloads, dismissActiveDownload]);

  // Pulse the tab when new items arrive
  useEffect(() => {
    if (totalCount > prevCountRef.current && !isOpen) {
      setHasNewItems(true);
      const timer = setTimeout(() => setHasNewItems(false), 2000);
      return () => clearTimeout(timer);
    }
    prevCountRef.current = totalCount;
  }, [totalCount, isOpen]);

  // Close on Escape
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    },
    [isOpen]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <>
      {/* Tab button — always visible on right edge */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className={`fixed right-0 ${currentTrack ? 'bottom-[88px]' : 'bottom-4'} z-[45] flex items-center gap-1.5 px-1.5 py-3 rounded-l-lg border border-r-0 border-dark-500 bg-dark-800/95 backdrop-blur-sm hover:bg-dark-700 transition-all duration-200 ${
          hasNewItems ? 'shadow-[0_0_12px_rgba(0,255,136,0.3)]' : ''
        } ${isOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
        title="Toggle queue"
      >
        <div className="relative">
          <ListMusic className="w-4 h-4 text-gray-400" />
          {totalCount > 0 && (
            <span
              className={`absolute -top-2 -left-2.5 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full font-mono text-[10px] font-medium leading-none ${
                activeCount > 0
                  ? 'bg-blue-500 text-white'
                  : 'bg-dark-500 text-gray-300'
              }`}
            >
              {totalCount}
            </span>
          )}
        </div>
      </button>

      {/* Sidebar panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={sidebarRef}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 400, damping: 35 }}
            className={`fixed right-0 top-0 ${bottomOffset} z-[45] w-80 bg-dark-900/95 backdrop-blur-sm border-l border-dark-500 flex flex-col`}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-dark-500">
              <div className="flex items-center gap-3">
                <h2 className="font-mono text-sm font-medium text-gray-200">
                  Queue
                </h2>
                <div className="flex items-center gap-2 font-mono text-[11px]">
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
              </div>
              <div className="flex items-center gap-1">
                {inactiveCount > 0 && (
                  <button
                    onClick={clearInactive}
                    className="px-2 py-0.5 font-mono text-[11px] text-gray-500 hover:text-gray-300 hover:bg-dark-600 rounded transition-colors"
                  >
                    Clear
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 text-gray-500 hover:text-gray-300 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Scrollable item list */}
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
                        onDismiss={() =>
                          dismissActiveDownload(download.trackingId)
                        }
                      />
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
