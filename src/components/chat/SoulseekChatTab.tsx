import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Loader2, MessageSquare, Send, ArrowLeft } from 'lucide-react';
import { api } from '../../lib/api';
import { useChat } from '../../store';
import { getUsernameColor } from '../../lib/colors';
import type { SoulseekChatMessage } from '../../types';

function formatTimestamp(ts: number): string {
  const date = new Date(ts * 1000);
  return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

function ConversationList({
  conversations,
  activeUsername,
  onSelect,
}: {
  conversations: Map<string, SoulseekChatMessage[]>;
  activeUsername: string | null;
  onSelect: (username: string) => void;
}) {
  // Sort by most recent message
  const sorted = useMemo(() => {
    return Array.from(conversations.entries()).sort(([, a], [, b]) => {
      const lastA = a[a.length - 1]?.timestamp || 0;
      const lastB = b[b.length - 1]?.timestamp || 0;
      return lastB - lastA;
    });
  }, [conversations]);

  if (sorted.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-600 gap-2">
        <MessageSquare className="w-6 h-6" />
        <span className="font-mono text-xs">No conversations</span>
      </div>
    );
  }

  return (
    <div className="overflow-y-auto">
      {sorted.map(([username, messages]) => {
        const lastMsg = messages[messages.length - 1];
        const isActive = username === activeUsername;
        return (
          <button
            key={username}
            onClick={() => onSelect(username)}
            className={`w-full text-left px-4 py-3 border-b border-dark-600/50 hover:bg-dark-700/50 transition-colors ${
              isActive ? 'bg-dark-700/70 border-l-2 border-l-terminal-green' : ''
            }`}
          >
            <div className="font-mono text-xs font-medium" style={{ color: getUsernameColor(username) }}>
              {username}
            </div>
            {lastMsg && (
              <div className="font-mono text-[11px] text-gray-500 truncate mt-0.5">
                {lastMsg.incoming ? '' : 'You: '}{lastMsg.message}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

function ConversationThread({
  username,
  messages,
  onBack,
}: {
  username: string;
  messages: SoulseekChatMessage[];
  onBack: () => void;
}) {
  const [replyText, setReplyText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const sendMutation = useMutation({
    mutationFn: ({ username, message }: { username: string; message: string }) =>
      api.sendSoulseekMessage(username, message),
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = useCallback(() => {
    const trimmed = replyText.trim();
    if (!trimmed) return;
    sendMutation.mutate({ username, message: trimmed });
    setReplyText('');
  }, [replyText, username, sendMutation]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-dark-500">
        <button onClick={onBack} className="p-1 text-gray-500 hover:text-gray-300 transition-colors lg:hidden">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <span className="font-mono text-sm font-medium" style={{ color: getUsernameColor(username) }}>
          {username}
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-2">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`px-4 py-1.5 ${msg.incoming ? '' : 'flex flex-col items-end'}`}
          >
            <div className={`max-w-[80%] ${msg.incoming ? '' : 'text-right'}`}>
              <div className="font-mono text-xs text-gray-300">
                {msg.message}
              </div>
              <div className="font-mono text-[10px] text-gray-600 mt-0.5">
                {formatTimestamp(msg.timestamp)}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply input */}
      <div className="border-t border-dark-500 flex items-center gap-2 px-3 py-2">
        <input
          type="text"
          value={replyText}
          onChange={(e) => setReplyText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder={`Message ${username}...`}
          className="flex-1 bg-transparent border-none outline-none font-mono text-xs text-gray-200 placeholder-gray-600"
          disabled={sendMutation.isPending}
        />
        <button
          onClick={handleSend}
          disabled={sendMutation.isPending || !replyText.trim()}
          className="flex-shrink-0 p-1.5 text-gray-500 hover:text-terminal-green disabled:opacity-30 transition-colors"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export function SoulseekChatTab() {
  const {
    soulseekConversations,
    setSoulseekConversations,
    activeSoulseekConversation,
    setActiveSoulseekConversation,
  } = useChat();

  // Load initial messages
  const { isLoading } = useQuery({
    queryKey: ['soulseekChat'],
    queryFn: async () => {
      const messages = await api.getSoulseekMessages();
      // Group by username
      const convos = new Map<string, SoulseekChatMessage[]>();
      for (const msg of messages) {
        const existing = convos.get(msg.username) || [];
        existing.push(msg);
        convos.set(msg.username, existing);
      }
      setSoulseekConversations(convos);
      return messages;
    },
    staleTime: 1000 * 60, // 1 minute
  });

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
      </div>
    );
  }

  const activeMessages = activeSoulseekConversation
    ? soulseekConversations.get(activeSoulseekConversation) || []
    : [];

  return (
    <div className="flex h-full">
      {/* Left: Conversation list */}
      <div
        className={`w-64 border-r border-dark-500 flex-shrink-0 ${
          activeSoulseekConversation ? 'hidden lg:block' : ''
        }`}
      >
        <ConversationList
          conversations={soulseekConversations}
          activeUsername={activeSoulseekConversation}
          onSelect={setActiveSoulseekConversation}
        />
      </div>

      {/* Right: Thread */}
      <div className={`flex-1 ${!activeSoulseekConversation ? 'hidden lg:flex' : 'flex'} flex-col`}>
        {activeSoulseekConversation ? (
          <ConversationThread
            username={activeSoulseekConversation}
            messages={activeMessages}
            onBack={() => setActiveSoulseekConversation(null)}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-600">
            <div className="text-center">
              <MessageSquare className="w-8 h-8 mx-auto mb-2" />
              <span className="font-mono text-xs">Select a conversation</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
