import { useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUsernameColor } from '../../lib/colors';
import { useAppStore } from '../../store';
import { TrackReferenceCard } from './TrackReferenceCard';
import { ListReferenceCard } from './ListReferenceCard';
import type { LocalChatMessage } from '../../types';

interface ChatMessageBubbleProps {
  message: LocalChatMessage;
  currentUserId: number;
  /** Set to true to disable username click → DM behavior (e.g. in DM threads) */
  disableUsernameClick?: boolean;
}

type MessageSegment =
  | { type: 'text'; content: string }
  | { type: 'track'; itemId: number }
  | { type: 'list'; listId: number };

// Parse message text into segments of plain text, track references, and list references
function parseMessage(text: string): MessageSegment[] {
  const regex = /\[track:(\d+)\]|\[list:(\d+)\]/g;
  const segments: MessageSegment[] = [];
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', content: text.slice(lastIndex, match.index) });
    }
    if (match[1]) {
      segments.push({ type: 'track', itemId: parseInt(match[1], 10) });
    } else if (match[2]) {
      segments.push({ type: 'list', listId: parseInt(match[2], 10) });
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    segments.push({ type: 'text', content: text.slice(lastIndex) });
  }

  return segments;
}

function formatTimestamp(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'now';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;

  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function ChatMessageBubble({ message, currentUserId, disableUsernameClick }: ChatMessageBubbleProps) {
  const segments = useMemo(() => parseMessage(message.message), [message.message]);
  const isSystem = message.user_id === 0 || message.username === 'system';
  const displayName = message.display_name || message.username;
  const navigate = useNavigate();
  const openDmWith = useAppStore((s) => s.openDmWith);

  const isClickable = !disableUsernameClick && !isSystem && message.user_id !== currentUserId;

  const handleUsernameClick = useCallback(() => {
    if (!isClickable) return;
    openDmWith(message.user_id);
    navigate('/chat');
  }, [isClickable, openDmWith, message.user_id, navigate]);

  // System messages get distinct styling
  if (isSystem) {
    return (
      <div className="px-4 py-1.5">
        <div className="font-mono text-xs text-gray-500 italic whitespace-pre-wrap">
          {message.message}
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-1.5 hover:bg-dark-700/30 transition-colors group">
      <div className="flex items-baseline gap-2">
        {/* Username */}
        {isClickable ? (
          <button
            onClick={handleUsernameClick}
            className="font-mono text-xs font-medium flex-shrink-0 hover:underline cursor-pointer"
            style={{ color: getUsernameColor(message.username) }}
          >
            {displayName}
          </button>
        ) : (
          <span
            className="font-mono text-xs font-medium flex-shrink-0"
            style={{ color: getUsernameColor(message.username) }}
          >
            {displayName}
          </span>
        )}

        {/* Timestamp */}
        <span className="font-mono text-[10px] text-gray-600 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          {formatTimestamp(message.created_at)}
        </span>
      </div>

      {/* Message content */}
      <div className="font-mono text-xs text-gray-300 mt-0.5 break-words">
        {segments.map((segment, i) => {
          switch (segment.type) {
            case 'text':
              return <span key={i}>{segment.content}</span>;
            case 'track':
              return <TrackReferenceCard key={i} itemId={segment.itemId} />;
            case 'list':
              return <ListReferenceCard key={i} listId={segment.listId} />;
          }
        })}
      </div>
    </div>
  );
}
