import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Loader2, MessageSquare, ArrowLeft, Plus, Search, X } from 'lucide-react';
import { api } from '../../lib/api';
import { useChat, useAuth } from '../../store';
import { getUsernameColor } from '../../lib/colors';
import { ChatMessageBubble } from './ChatMessageBubble';
import { ChatInput } from './ChatInput';
import type { DirectMessage, DmConversationSummary, UserSummary, LocalChatMessage } from '../../types';

// ============================================================================
// User Search Popup (for "New message" button)
// ============================================================================

function UserSearchPopup({
  onSelect,
  onClose,
}: {
  onSelect: (user: UserSummary) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserSummary[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const users = await api.searchUsers(query.trim());
        setResults(users);
      } catch {
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  return (
    <div className="border-b border-dark-500 bg-dark-700/50">
      <div className="flex items-center gap-2 px-3 py-2">
        <Search className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search users..."
          className="flex-1 bg-transparent border-none outline-none font-mono text-xs text-gray-200 placeholder-gray-600"
        />
        <button onClick={onClose} className="p-0.5 text-gray-500 hover:text-gray-300 transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Results */}
      {(results.length > 0 || isSearching) && (
        <div className="max-h-40 overflow-y-auto">
          {isSearching && results.length === 0 && (
            <div className="flex justify-center py-2">
              <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
            </div>
          )}
          {results.map((user) => (
            <button
              key={user.id}
              onClick={() => onSelect(user)}
              className="w-full text-left px-4 py-2 hover:bg-dark-600/50 transition-colors"
            >
              <span className="font-mono text-xs font-medium" style={{ color: getUsernameColor(user.username) }}>
                {user.display_name || user.username}
              </span>
              {user.display_name && (
                <span className="font-mono text-[11px] text-gray-500 ml-2">@{user.username}</span>
              )}
            </button>
          ))}
          {!isSearching && query.trim() && results.length === 0 && (
            <div className="px-4 py-2 font-mono text-[11px] text-gray-600">No users found</div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Conversation List (left panel)
// ============================================================================

function DmConversationList({
  conversations,
  activeUserId,
  onSelect,
  onNewMessage,
}: {
  conversations: DmConversationSummary[];
  activeUserId: number | null;
  onSelect: (userId: number) => void;
  onNewMessage: () => void;
}) {
  return (
    <div className="flex flex-col h-full">
      {/* New message button */}
      <div className="p-2 border-b border-dark-500">
        <button
          onClick={onNewMessage}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 font-mono text-xs text-gray-400 hover:text-terminal-green border border-dark-500 rounded hover:border-terminal-green/30 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          New message
        </button>
      </div>

      {/* Conversations */}
      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-600 gap-2">
            <MessageSquare className="w-6 h-6" />
            <span className="font-mono text-xs">No conversations yet</span>
          </div>
        ) : (
          conversations.map((convo) => {
            const isActive = convo.user_id === activeUserId;
            const displayName = convo.display_name || convo.username;
            return (
              <button
                key={convo.user_id}
                onClick={() => onSelect(convo.user_id)}
                className={`w-full text-left px-4 py-3 border-b border-dark-600/50 hover:bg-dark-700/50 transition-colors ${
                  isActive ? 'bg-dark-700/70 border-l-2 border-l-terminal-green' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-medium" style={{ color: getUsernameColor(convo.username) }}>
                    {displayName}
                  </span>
                  {convo.unread_count > 0 && (
                    <span className="bg-terminal-green/20 text-terminal-green text-[10px] font-mono px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                      {convo.unread_count}
                    </span>
                  )}
                </div>
                <div className="font-mono text-[11px] text-gray-500 truncate mt-0.5">
                  {convo.last_message}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

// ============================================================================
// DM Thread (right panel)
// ============================================================================

function DmThread({
  userId,
  onBack,
}: {
  userId: number;
  onBack: () => void;
}) {
  const { user } = useAuth();
  const {
    dmThreads,
    dmConversations,
    setDmThread,
    prependDmMessages,
    dmDrafts,
    setDmDraft,
    clearDmDraft,
  } = useChat();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isAutoScroll, setIsAutoScroll] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const initialLoadDone = useRef(false);

  const messages = dmThreads.get(userId) || [];
  const convo = dmConversations.find(c => c.user_id === userId);
  const displayName = convo?.display_name || convo?.username || `User ${userId}`;
  const username = convo?.username || `user-${userId}`;

  // Load thread
  const { isLoading } = useQuery({
    queryKey: ['dmThread', userId],
    queryFn: async () => {
      const msgs = await api.getDmThread(userId, 50);
      const reversed = [...msgs].reverse();
      setDmThread(userId, reversed);
      setHasMore(msgs.length === 50);
      initialLoadDone.current = true;
      // Mark as read
      api.markDmsRead(userId).catch(() => {});
      return reversed;
    },
    staleTime: 1000 * 30, // 30 seconds
  });

  // Send message
  const sendMutation = useMutation({
    mutationFn: (message: string) => api.sendDirectMessage(userId, message),
  });

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (isAutoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length, isAutoScroll]);

  // Scroll to bottom on initial load
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

  // Load older messages
  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore || messages.length === 0) return;
    const oldestId = messages[0]?.id;
    if (!oldestId) return;

    setIsLoadingMore(true);
    try {
      const older = await api.getDmThread(userId, 50, oldestId);
      const reversed = [...older].reverse();
      if (reversed.length > 0) {
        prependDmMessages(userId, reversed);
      }
      setHasMore(older.length === 50);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasMore, messages, userId, prependDmMessages]);

  const handleScrollForPagination = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    if (container.scrollTop < 100 && hasMore && !isLoadingMore) {
      loadMore();
    }
    handleScroll();
  }, [loadMore, handleScroll, hasMore, isLoadingMore]);

  // Convert DM to LocalChatMessage format for ChatMessageBubble
  const chatMessages: LocalChatMessage[] = useMemo(() =>
    messages.map(dm => ({
      id: dm.id,
      user_id: dm.sender_id,
      username: dm.sender_username,
      display_name: dm.sender_display_name,
      has_avatar: dm.sender_has_avatar,
      message: dm.message,
      created_at: dm.created_at,
    })),
    [messages]
  );

  const handleSend = useCallback(
    (message: string) => {
      sendMutation.mutate(message);
      clearDmDraft(userId);
    },
    [sendMutation, clearDmDraft, userId]
  );

  const handleHelp = useCallback(() => {
    // Add a local help message to the thread — we reuse the same pattern
    // but since DM threads use DirectMessage[], we'll just show it inline
    // by inserting a synthetic message into the thread via addDirectMessage
  }, []);

  const draft = dmDrafts.get(userId) || '';

  const handleDraftChange = useCallback(
    (text: string) => {
      setDmDraft(userId, text);
    },
    [setDmDraft, userId]
  );

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-dark-500">
        <button onClick={onBack} className="p-1 text-gray-500 hover:text-gray-300 transition-colors lg:hidden">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <span className="font-mono text-sm font-medium" style={{ color: getUsernameColor(username) }}>
          {displayName}
        </span>
      </div>

      {/* Messages */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScrollForPagination}
        className="flex-1 overflow-y-auto"
      >
        {isLoadingMore && (
          <div className="flex justify-center py-2">
            <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
          </div>
        )}

        {chatMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-600 gap-2">
            <MessageSquare className="w-8 h-8" />
            <span className="font-mono text-xs">No messages yet</span>
            <span className="font-mono text-[11px] text-gray-700">
              Send a message to start the conversation
            </span>
          </div>
        ) : (
          <div className="py-2">
            {chatMessages.map((msg) => (
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

      {/* Input with draft persistence */}
      <ChatInput
        onSend={handleSend}
        onHelp={handleHelp}
        disabled={sendMutation.isPending}
        placeholder={`Message ${displayName}...`}
        draft={draft}
        onDraftChange={handleDraftChange}
      />
    </div>
  );
}

// ============================================================================
// Main DirectMessageTab
// ============================================================================

export function DirectMessageTab() {
  const {
    dmConversations,
    activeDmUserId,
    setDmConversations,
    setActiveDmUserId,
  } = useChat();

  const [showUserSearch, setShowUserSearch] = useState(false);

  // Load conversations
  const { isLoading } = useQuery({
    queryKey: ['dmConversations'],
    queryFn: async () => {
      const convos = await api.getDmConversations();
      setDmConversations(convos);
      return convos;
    },
    staleTime: 1000 * 30, // 30 seconds
  });

  const handleSelectConversation = useCallback((userId: number) => {
    setActiveDmUserId(userId);
    setShowUserSearch(false);
  }, [setActiveDmUserId]);

  const handleSelectUser = useCallback((user: UserSummary) => {
    setActiveDmUserId(user.id);
    setShowUserSearch(false);
    // Add to conversations if not already there
    const exists = dmConversations.some(c => c.user_id === user.id);
    if (!exists) {
      setDmConversations([
        {
          user_id: user.id,
          username: user.username,
          display_name: user.display_name,
          has_avatar: user.has_avatar,
          last_message: '',
          last_message_at: new Date().toISOString(),
          unread_count: 0,
        },
        ...dmConversations,
      ]);
    }
  }, [setActiveDmUserId, dmConversations, setDmConversations]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Left: Conversation list */}
      <div
        className={`w-64 border-r border-dark-500 flex-shrink-0 ${
          activeDmUserId ? 'hidden lg:flex lg:flex-col' : 'flex flex-col'
        }`}
      >
        {showUserSearch && (
          <UserSearchPopup
            onSelect={handleSelectUser}
            onClose={() => setShowUserSearch(false)}
          />
        )}
        <DmConversationList
          conversations={dmConversations}
          activeUserId={activeDmUserId}
          onSelect={handleSelectConversation}
          onNewMessage={() => setShowUserSearch(true)}
        />
      </div>

      {/* Right: Thread */}
      <div className={`flex-1 ${!activeDmUserId ? 'hidden lg:flex' : 'flex'} flex-col`}>
        {activeDmUserId ? (
          <DmThread
            key={activeDmUserId}
            userId={activeDmUserId}
            onBack={() => setActiveDmUserId(null)}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-600">
            <div className="text-center">
              <MessageSquare className="w-8 h-8 mx-auto mb-2" />
              <span className="font-mono text-xs">Select a conversation or start a new message</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
