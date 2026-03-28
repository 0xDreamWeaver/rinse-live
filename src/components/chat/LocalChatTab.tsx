import { useEffect, useRef, useState, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Loader2, MessageSquare } from 'lucide-react';
import { api } from '../../lib/api';
import { useChat, useAuth } from '../../store';
import { ChatMessageBubble } from './ChatMessageBubble';
import { ChatInput } from './ChatInput';

export function LocalChatTab() {
  const { user } = useAuth();
  const {
    localChatMessages,
    setLocalChatMessages,
    prependLocalChatMessages,
    addLocalChatMessage,
    markLocalChatRead,
    localChatDraft,
    setLocalChatDraft,
  } = useChat();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isAutoScroll, setIsAutoScroll] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const initialLoadDone = useRef(false);

  // Initial load
  const { isLoading } = useQuery({
    queryKey: ['localChat'],
    queryFn: async () => {
      const messages = await api.getLocalChatMessages(50);
      // Messages come in DESC order, reverse for display
      const reversed = [...messages].reverse();
      setLocalChatMessages(reversed);
      setHasMore(messages.length === 50);
      initialLoadDone.current = true;
      return reversed;
    },
    staleTime: Infinity, // Don't refetch - WebSocket handles real-time
  });

  // Send message mutation
  const sendMutation = useMutation({
    mutationFn: (message: string) => api.sendLocalChatMessage(message),
  });

  // Mark as read when component mounts
  useEffect(() => {
    markLocalChatRead();
  }, [markLocalChatRead]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (isAutoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [localChatMessages.length, isAutoScroll]);

  // Also scroll to bottom on initial load
  useEffect(() => {
    if (initialLoadDone.current && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView();
    }
  }, [isLoading]);

  // Detect if user scrolled up
  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const { scrollTop, scrollHeight, clientHeight } = container;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
    setIsAutoScroll(isAtBottom);
  }, []);

  // Load older messages when scrolling to top
  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore || localChatMessages.length === 0) return;

    const oldestId = localChatMessages[0]?.id;
    if (!oldestId) return;

    setIsLoadingMore(true);
    try {
      const older = await api.getLocalChatMessages(50, oldestId);
      const reversed = [...older].reverse();
      if (reversed.length > 0) {
        prependLocalChatMessages(reversed);
      }
      setHasMore(older.length === 50);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasMore, localChatMessages, prependLocalChatMessages]);

  // Scroll-to-top loader
  const handleScrollForPagination = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    if (container.scrollTop < 100 && hasMore && !isLoadingMore) {
      loadMore();
    }
    handleScroll();
  }, [loadMore, handleScroll, hasMore, isLoadingMore]);

  const handleSend = useCallback(
    (message: string) => {
      sendMutation.mutate(message);
    },
    [sendMutation]
  );

  const handleHelp = useCallback(() => {
    addLocalChatMessage({
      id: -Date.now(),
      user_id: 0,
      username: 'system',
      display_name: 'System',
      has_avatar: false,
      message: '/share <query> \u2014 Share a track from your library\n/list <query> \u2014 Share a list\n/help \u2014 Show this help',
      created_at: new Date().toISOString(),
    });
  }, [addLocalChatMessage]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScrollForPagination}
        className="flex-1 overflow-y-auto"
      >
        {/* Load more indicator */}
        {isLoadingMore && (
          <div className="flex justify-center py-2">
            <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
          </div>
        )}

        {localChatMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-600 gap-2">
            <MessageSquare className="w-8 h-8" />
            <span className="font-mono text-xs">No messages yet</span>
            <span className="font-mono text-[11px] text-gray-700">
              Be the first to say something!
            </span>
          </div>
        ) : (
          <div className="py-2">
            {localChatMessages.map((msg) => (
              <ChatMessageBubble
                key={msg.id}
                message={msg}
                currentUserId={user?.id || 0}
              />
            ))}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <ChatInput
        onSend={handleSend}
        onHelp={handleHelp}
        disabled={sendMutation.isPending}
        draft={localChatDraft}
        onDraftChange={setLocalChatDraft}
      />
    </div>
  );
}
