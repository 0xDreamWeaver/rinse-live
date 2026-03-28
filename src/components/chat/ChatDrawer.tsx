import { useEffect, useRef, useCallback } from 'react';
import { MessageSquare } from 'lucide-react';
import { useAppStore, useAuth } from '../../store';
import { useShallow } from 'zustand/react/shallow';
import { ChatMessageBubble } from './ChatMessageBubble';
import { ChatInput } from './ChatInput';
import { api } from '../../lib/api';
import { useMutation, useQuery } from '@tanstack/react-query';
import type { LocalChatMessage } from '../../types';

/** Pure content component for the chat panel — rendered by RightDrawers */
export function ChatPanelContent() {
  const { user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    localChatMessages,
    chatDrawerOpen,
    chatDrawerPrefill,
    setLocalChatMessages,
    addLocalChatMessage,
    markLocalChatRead,
    clearChatDrawerPrefill,
    localChatDraft,
    setLocalChatDraft,
  } = useAppStore(
    useShallow((s) => ({
      localChatMessages: s.localChatMessages,
      chatDrawerOpen: s.chatDrawerOpen,
      chatDrawerPrefill: s.chatDrawerPrefill,
      setLocalChatMessages: s.setLocalChatMessages,
      addLocalChatMessage: s.addLocalChatMessage,
      markLocalChatRead: s.markLocalChatRead,
      clearChatDrawerPrefill: s.clearChatDrawerPrefill,
      localChatDraft: s.localChatDraft,
      setLocalChatDraft: s.setLocalChatDraft,
    }))
  );

  // Load messages if not already loaded
  useQuery({
    queryKey: ['localChat'],
    queryFn: async () => {
      const messages = await api.getLocalChatMessages(50);
      const reversed = [...messages].reverse();
      setLocalChatMessages(reversed);
      return reversed;
    },
    staleTime: Infinity,
    enabled: chatDrawerOpen && localChatMessages.length === 0,
  });

  // Send mutation
  const sendMutation = useMutation({
    mutationFn: (message: string) => api.sendLocalChatMessage(message),
  });

  // Mark as read when drawer opens
  useEffect(() => {
    if (chatDrawerOpen) {
      markLocalChatRead();
    }
  }, [chatDrawerOpen, markLocalChatRead]);

  // Auto-scroll when new messages arrive while drawer is open
  useEffect(() => {
    if (chatDrawerOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [localChatMessages.length, chatDrawerOpen]);

  const handleSend = useCallback(
    (message: string) => {
      sendMutation.mutate(message);
    },
    [sendMutation]
  );

  const handleHelp = useCallback(() => {
    const helpMessage: LocalChatMessage = {
      id: -Date.now(),
      user_id: 0,
      username: 'system',
      display_name: 'System',
      has_avatar: false,
      message: '/share <query> \u2014 Share a track from your library\n/list <query> \u2014 Share a list\n/help \u2014 Show this help',
      created_at: new Date().toISOString(),
    };
    addLocalChatMessage(helpMessage);
  }, [addLocalChatMessage]);

  // Show last 15 messages
  const recentMessages = localChatMessages.slice(-15);

  return (
    <>
      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        {recentMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-600 font-mono text-xs gap-2">
            <MessageSquare className="w-6 h-6" />
            <span>No messages yet</span>
          </div>
        ) : (
          <div className="py-1">
            {recentMessages.map((msg) => (
              <ChatMessageBubble
                key={msg.id}
                message={msg}
                currentUserId={user?.id || 0}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Quick send */}
      <ChatInput
        onSend={handleSend}
        onHelp={handleHelp}
        disabled={sendMutation.isPending}
        prefill={chatDrawerPrefill}
        onPrefillConsumed={clearChatDrawerPrefill}
        draft={localChatDraft}
        onDraftChange={setLocalChatDraft}
      />
    </>
  );
}
