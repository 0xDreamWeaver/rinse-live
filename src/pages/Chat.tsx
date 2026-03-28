import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Radio, Mail } from 'lucide-react';
import { useAuth, useChat } from '../store';
import { LocalChatTab } from '../components/chat/LocalChatTab';
import { SoulseekChatTab } from '../components/chat/SoulseekChatTab';
import { DirectMessageTab } from '../components/chat/DirectMessageTab';

type ChatTab = 'local' | 'dm' | 'soulseek';

export function Chat() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const { pendingChatTab, clearPendingChatTab } = useChat();
  const [activeTab, setActiveTab] = useState<ChatTab>('local');

  // Auto-switch to DMs tab when openDmWith is called from elsewhere
  useEffect(() => {
    if (pendingChatTab === 'dm') {
      setActiveTab('dm');
      clearPendingChatTab();
    }
  }, [pendingChatTab, clearPendingChatTab]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col h-[calc(100vh-8rem)]"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-mono text-lg text-terminal-green font-medium">Chat</h1>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-dark-500 mb-0">
        <button
          onClick={() => setActiveTab('local')}
          className={`flex items-center gap-2 px-4 py-2 font-mono text-xs transition-colors relative ${
            activeTab === 'local'
              ? 'text-terminal-green'
              : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          Local
          {activeTab === 'local' && (
            <motion.div
              layoutId="chatTab"
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-terminal-green"
            />
          )}
        </button>

        <button
          onClick={() => setActiveTab('dm')}
          className={`flex items-center gap-2 px-4 py-2 font-mono text-xs transition-colors relative ${
            activeTab === 'dm'
              ? 'text-terminal-green'
              : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          <Mail className="w-3.5 h-3.5" />
          DMs
          {activeTab === 'dm' && (
            <motion.div
              layoutId="chatTab"
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-terminal-green"
            />
          )}
        </button>

        {isAdmin && (
          <button
            onClick={() => setActiveTab('soulseek')}
            className={`flex items-center gap-2 px-4 py-2 font-mono text-xs transition-colors relative ${
              activeTab === 'soulseek'
                ? 'text-terminal-green'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            Soulseek
            {activeTab === 'soulseek' && (
              <motion.div
                layoutId="chatTab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-terminal-green"
              />
            )}
          </button>
        )}
      </div>

      {/* Tab content */}
      <div className="flex-1 border border-t-0 border-dark-500 rounded-b-lg overflow-hidden bg-dark-800/50">
        {activeTab === 'local' && <LocalChatTab />}
        {activeTab === 'dm' && <DirectMessageTab />}
        {activeTab === 'soulseek' && isAdmin && <SoulseekChatTab />}
      </div>
    </motion.div>
  );
}
