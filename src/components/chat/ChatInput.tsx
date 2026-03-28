import { useState, useRef, useCallback, useEffect } from 'react';
import { Send } from 'lucide-react';
import { api } from '../../lib/api';
import { ShareSearchPopup } from './ShareSearchPopup';
import { ListSearchPopup } from './ListSearchPopup';
import type { ShareSearchItem } from '../../types';
import type { List } from '../../types';

type ActiveCommand = 'share' | 'list' | null;

interface ChatInputProps {
  onSend: (message: string) => void;
  onHelp?: () => void;
  disabled?: boolean;
  placeholder?: string;
  prefill?: string | null;
  onPrefillConsumed?: () => void;
  /** Initial draft value (restores on mount, not on every render) */
  draft?: string;
  /** Called on every keystroke to persist the draft externally */
  onDraftChange?: (text: string) => void;
}

export function ChatInput({
  onSend,
  onHelp,
  disabled,
  placeholder = 'Message \u2014 /help for commands',
  prefill,
  onPrefillConsumed,
  draft,
  onDraftChange,
}: ChatInputProps) {
  const [value, setValue] = useState(draft || '');
  const [activeCommand, setActiveCommand] = useState<ActiveCommand>(null);
  const [commandQuery, setCommandQuery] = useState('');
  const [shareResults, setShareResults] = useState<ShareSearchItem[]>([]);
  const [listResults, setListResults] = useState<List[]>([]);
  const [commandLoading, setCommandLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Handle prefill from store — append to existing input, never replace
  useEffect(() => {
    if (prefill) {
      setValue((prev) => {
        const trimmed = prev.trimEnd();
        return trimmed ? `${trimmed} ${prefill}` : prefill;
      });
      onPrefillConsumed?.();
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [prefill, onPrefillConsumed]);

  const handleSubmit = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;

    // Handle /help command
    if (/^\/help$/i.test(trimmed)) {
      onHelp?.();
      setValue('');
      setActiveCommand(null);
      setCommandQuery('');
      return;
    }

    onSend(trimmed);
    setValue('');
    onDraftChange?.('');
    setActiveCommand(null);
    setCommandQuery('');
    setShareResults([]);
    setListResults([]);
  }, [value, disabled, onSend, onHelp, onDraftChange]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Detect /share and /list commands and debounce search
  useEffect(() => {
    const shareMatch = value.match(/^\/share\s+(.+)/i);
    const listMatch = value.match(/^\/list\s+(.+)/i);

    if (shareMatch) {
      const query = shareMatch[1].trim();
      if (query.length > 0) {
        setActiveCommand('share');
        setCommandQuery(query);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(async () => {
          setCommandLoading(true);
          try {
            const results = await api.searchItemsForShare(query);
            setShareResults(results);
          } catch {
            setShareResults([]);
          } finally {
            setCommandLoading(false);
          }
        }, 300);
      } else {
        setActiveCommand(null);
        setCommandQuery('');
        setShareResults([]);
      }
    } else if (listMatch) {
      const query = listMatch[1].trim();
      if (query.length > 0) {
        setActiveCommand('list');
        setCommandQuery(query);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(async () => {
          setCommandLoading(true);
          try {
            const results = await api.searchListsForShare(query);
            setListResults(results);
          } catch {
            setListResults([]);
          } finally {
            setCommandLoading(false);
          }
        }, 300);
      } else {
        setActiveCommand(null);
        setCommandQuery('');
        setListResults([]);
      }
    } else {
      setActiveCommand(null);
      setCommandQuery('');
      setShareResults([]);
      setListResults([]);
    }
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value]);

  const handleShareSelect = (item: ShareSearchItem) => {
    setValue(`[track:${item.id}]`);
    setActiveCommand(null);
    setCommandQuery('');
    setShareResults([]);
    inputRef.current?.focus();
  };

  const handleListSelect = (list: List) => {
    setValue(`[list:${list.id}]`);
    setActiveCommand(null);
    setCommandQuery('');
    setListResults([]);
    inputRef.current?.focus();
  };

  const closePopup = () => {
    setActiveCommand(null);
    setCommandQuery('');
    setShareResults([]);
    setListResults([]);
  };

  return (
    <div className="relative border-t border-dark-500">
      {/* Share search popup */}
      {activeCommand === 'share' && (
        <ShareSearchPopup
          items={shareResults}
          isLoading={commandLoading}
          onSelect={handleShareSelect}
          onClose={closePopup}
        />
      )}

      {/* List search popup */}
      {activeCommand === 'list' && (
        <ListSearchPopup
          lists={listResults}
          isLoading={commandLoading}
          onSelect={handleListSelect}
          onClose={closePopup}
        />
      )}

      <div className="flex items-center gap-2 px-3 py-2">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            onDraftChange?.(e.target.value);
          }}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={placeholder}
          className="flex-1 bg-transparent border-none outline-none font-mono text-xs text-gray-200 placeholder-gray-600"
          maxLength={2000}
        />
        <button
          onClick={handleSubmit}
          disabled={disabled || !value.trim()}
          className="flex-shrink-0 p-1.5 text-gray-500 hover:text-terminal-green disabled:opacity-30 disabled:hover:text-gray-500 transition-colors"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
