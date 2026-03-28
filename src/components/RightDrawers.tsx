import { useEffect, useRef, useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare,
  ListMusic,
  X,
  Loader2,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';
import { useShallow } from 'zustand/react/shallow';
import { QueuePanelContent } from './DownloadToasts';
import { ChatPanelContent } from './chat/ChatDrawer';

export function RightDrawers() {
  const navigate = useNavigate();
  const panelRef = useRef<HTMLDivElement>(null);
  const prevQueueCountRef = useRef(0);
  const [hasNewQueueItems, setHasNewQueueItems] = useState(false);

  const {
    chatDrawerOpen,
    queueDrawerOpen,
    setChatDrawerOpen,
    setQueueDrawerOpen,
    activeDownloads,
    dismissActiveDownload,
    unreadLocalChat,
    currentTrack,
  } = useAppStore(
    useShallow((s) => ({
      chatDrawerOpen: s.chatDrawerOpen,
      queueDrawerOpen: s.queueDrawerOpen,
      setChatDrawerOpen: s.setChatDrawerOpen,
      setQueueDrawerOpen: s.setQueueDrawerOpen,
      activeDownloads: s.activeDownloads,
      dismissActiveDownload: s.dismissActiveDownload,
      unreadLocalChat: s.unreadLocalChat,
      currentTrack: s.currentTrack,
    }))
  );

  const anyOpen = chatDrawerOpen || queueDrawerOpen;
  const bottomOffset = currentTrack ? 'bottom-[72px]' : 'bottom-0';

  // Queue computations
  const sortedDownloads = Array.from(activeDownloads.values()).sort((a, b) => {
    const activeStages = ['searching', 'processing', 'selecting', 'downloading'];
    const aActive = activeStages.includes(a.stage);
    const bActive = activeStages.includes(b.stage);
    if (aActive && !bActive) return -1;
    if (!aActive && bActive) return 1;
    return b.createdAt - a.createdAt;
  });

  const totalQueueCount = sortedDownloads.length;
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

  // Pulse the floating queue icon when new items arrive
  useEffect(() => {
    if (totalQueueCount > prevQueueCountRef.current && !queueDrawerOpen) {
      setHasNewQueueItems(true);
      const timer = setTimeout(() => setHasNewQueueItems(false), 2000);
      return () => clearTimeout(timer);
    }
    prevQueueCountRef.current = totalQueueCount;
  }, [totalQueueCount, queueDrawerOpen]);

  const closeAll = useCallback(() => {
    setChatDrawerOpen(false);
    setQueueDrawerOpen(false);
  }, [setChatDrawerOpen, setQueueDrawerOpen]);

  // Close on Escape
  useEffect(() => {
    if (!anyOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeAll();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [anyOpen, closeAll]);

  // Close on click outside
  useEffect(() => {
    if (!anyOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        closeAll();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [anyOpen, closeAll]);

  return (
    <>
      {/* Floating tab strip — visible when no panel is open */}
      {!anyOpen && (
        <div
          className={`fixed right-0 ${currentTrack ? 'bottom-[88px]' : 'bottom-4'} z-[45] flex flex-col rounded-l-lg border border-r-0 border-dark-500 bg-dark-800/95 backdrop-blur-sm transition-all duration-200 ${
            hasNewQueueItems ? 'shadow-[0_0_12px_rgba(0,255,136,0.3)]' : ''
          }`}
        >
          {/* Chat button */}
          <button
            onClick={() => setChatDrawerOpen(true)}
            className="relative p-2.5 text-gray-400 hover:text-terminal-green hover:bg-dark-700 transition-colors rounded-tl-lg"
            title="Open chat"
          >
            <MessageSquare className="w-4 h-4" />
            {unreadLocalChat > 0 && (
              <span className="absolute top-1 right-1 min-w-[14px] h-3.5 px-0.5 flex items-center justify-center rounded-full font-mono text-[9px] font-medium leading-none bg-terminal-green text-dark-900">
                {unreadLocalChat > 99 ? '99+' : unreadLocalChat}
              </span>
            )}
          </button>

          <div className="border-t border-dark-600 mx-1.5" />

          {/* Queue button */}
          <button
            onClick={() => setQueueDrawerOpen(true)}
            className="relative p-2.5 text-gray-400 hover:text-terminal-green hover:bg-dark-700 transition-colors rounded-bl-lg"
            title="Open queue"
          >
            <ListMusic className="w-4 h-4" />
            {totalQueueCount > 0 && (
              <span
                className={`absolute top-1 right-1 min-w-[14px] h-3.5 px-0.5 flex items-center justify-center rounded-full font-mono text-[9px] font-medium leading-none ${
                  activeCount > 0
                    ? 'bg-blue-500 text-white'
                    : 'bg-dark-500 text-gray-300'
                }`}
              >
                {totalQueueCount}
              </span>
            )}
          </button>
        </div>
      )}

      {/* Panel — slides in from right */}
      <AnimatePresence>
        {anyOpen && (
          <motion.div
            ref={panelRef}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 400, damping: 35 }}
            className={`fixed right-0 top-0 ${bottomOffset} z-[45] w-80 bg-dark-900/95 backdrop-blur-sm border-l border-dark-500 flex flex-col`}
          >
            {/* Tab strip header */}
            <div className="flex items-center gap-1 px-2 py-2 border-b border-dark-500">
              {/* Chat tab */}
              <button
                onClick={() => !chatDrawerOpen && setChatDrawerOpen(true)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded font-mono text-xs transition-colors ${
                  chatDrawerOpen
                    ? 'bg-terminal-green/10 text-terminal-green cursor-default'
                    : 'text-gray-500 hover:text-gray-300 hover:bg-dark-600'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                Chat
                {!chatDrawerOpen && unreadLocalChat > 0 && (
                  <span className="min-w-[14px] h-3.5 px-0.5 flex items-center justify-center rounded-full text-[9px] font-medium leading-none bg-terminal-green text-dark-900">
                    {unreadLocalChat}
                  </span>
                )}
              </button>

              {/* Queue tab */}
              <button
                onClick={() => !queueDrawerOpen && setQueueDrawerOpen(true)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded font-mono text-xs transition-colors ${
                  queueDrawerOpen
                    ? 'bg-terminal-green/10 text-terminal-green cursor-default'
                    : 'text-gray-500 hover:text-gray-300 hover:bg-dark-600'
                }`}
              >
                <ListMusic className="w-3.5 h-3.5" />
                Queue
                {!queueDrawerOpen && totalQueueCount > 0 && (
                  <span
                    className={`min-w-[14px] h-3.5 px-0.5 flex items-center justify-center rounded-full text-[9px] font-medium leading-none ${
                      activeCount > 0
                        ? 'bg-blue-500 text-white'
                        : 'bg-dark-500 text-gray-300'
                    }`}
                  >
                    {totalQueueCount}
                  </span>
                )}
              </button>

              {/* Spacer */}
              <div className="flex-1" />

              {/* Panel-specific actions */}
              {queueDrawerOpen && (
                <div className="flex items-center gap-1.5 font-mono text-[11px]">
                  {activeCount > 0 && (
                    <span className="flex items-center gap-0.5 text-blue-400">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      {activeCount}
                    </span>
                  )}
                  {completedCount > 0 && (
                    <span className="flex items-center gap-0.5 text-terminal-green">
                      <CheckCircle2 className="w-3 h-3" />
                      {completedCount}
                    </span>
                  )}
                  {failedCount > 0 && (
                    <span className="flex items-center gap-0.5 text-red-400">
                      <XCircle className="w-3 h-3" />
                      {failedCount}
                    </span>
                  )}
                  {inactiveCount > 0 && (
                    <button
                      onClick={clearInactive}
                      className="px-1.5 py-0.5 text-gray-500 hover:text-gray-300 hover:bg-dark-600 rounded transition-colors"
                    >
                      Clear
                    </button>
                  )}
                </div>
              )}

              {chatDrawerOpen && (
                <button
                  onClick={() => {
                    closeAll();
                    navigate('/chat');
                  }}
                  className="px-2 py-0.5 font-mono text-[11px] text-gray-500 hover:text-terminal-green hover:bg-dark-600 rounded transition-colors"
                >
                  Open
                </button>
              )}

              {/* Close button */}
              <button
                onClick={closeAll}
                className="p-1 text-gray-500 hover:text-gray-300 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Panel content */}
            <div className="flex-1 overflow-hidden flex flex-col">
              {chatDrawerOpen && <ChatPanelContent />}
              {queueDrawerOpen && (
                <QueuePanelContent
                  sortedDownloads={sortedDownloads}
                  onDismiss={dismissActiveDownload}
                />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
