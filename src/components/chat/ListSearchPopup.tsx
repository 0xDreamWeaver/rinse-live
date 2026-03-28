import { useEffect, useRef } from 'react';
import { FileText } from 'lucide-react';
import type { List } from '../../types';

interface ListSearchPopupProps {
  lists: List[];
  isLoading: boolean;
  onSelect: (list: List) => void;
  onClose: () => void;
}

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    pending: 'text-yellow-500',
    downloading: 'text-blue-500',
    completed: 'text-terminal-green',
    partial: 'text-orange-500',
    failed: 'text-red-500',
  };
  return colors[status] || 'text-gray-500';
};

export function ListSearchPopup({ lists, isLoading, onSelect, onClose }: ListSearchPopupProps) {
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      ref={popupRef}
      className="absolute bottom-full left-0 right-0 mb-1 bg-dark-800 border border-dark-500 rounded-lg shadow-lg overflow-hidden z-10"
    >
      <div className="px-3 py-1.5 border-b border-dark-500">
        <span className="font-mono text-[11px] text-gray-500">Share a list</span>
      </div>

      {isLoading ? (
        <div className="px-3 py-4 text-center font-mono text-xs text-gray-500">
          Searching...
        </div>
      ) : lists.length === 0 ? (
        <div className="px-3 py-4 text-center font-mono text-xs text-gray-500">
          No matches
        </div>
      ) : (
        <div className="max-h-[240px] overflow-y-auto">
          {lists.map((list) => (
            <button
              key={list.id}
              onClick={() => onSelect(list)}
              className="flex items-center gap-2 w-full px-3 py-2 hover:bg-dark-600/50 transition-colors text-left"
            >
              {/* List icon */}
              <div className="w-6 h-6 rounded bg-dark-500 flex items-center justify-center flex-shrink-0">
                <FileText className="w-2.5 h-2.5 text-gray-600" />
              </div>

              {/* Name + meta */}
              <div className="min-w-0 flex-1">
                <div className="font-mono text-xs text-gray-200 truncate">
                  {list.name}
                </div>
                <div className="flex items-center gap-2 font-mono text-[10px] text-gray-500">
                  <span>{list.total_items} items</span>
                  <span className={`font-bold ${getStatusColor(list.status)}`}>
                    {list.status.toUpperCase()}
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
