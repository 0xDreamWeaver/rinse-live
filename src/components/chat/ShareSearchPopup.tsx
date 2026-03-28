import { useEffect, useRef } from 'react';
import { Play } from 'lucide-react';
import { api } from '../../lib/api';
import type { ShareSearchItem } from '../../types';

interface ShareSearchPopupProps {
  items: ShareSearchItem[];
  isLoading: boolean;
  onSelect: (item: ShareSearchItem) => void;
  onClose: () => void;
}

export function ShareSearchPopup({ items, isLoading, onSelect, onClose }: ShareSearchPopupProps) {
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
        <span className="font-mono text-[11px] text-gray-500">Share a track</span>
      </div>

      {isLoading ? (
        <div className="px-3 py-4 text-center font-mono text-xs text-gray-500">
          Searching...
        </div>
      ) : items.length === 0 ? (
        <div className="px-3 py-4 text-center font-mono text-xs text-gray-500">
          No matches
        </div>
      ) : (
        <div className="max-h-[240px] overflow-y-auto">
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => onSelect(item)}
              className="flex items-center gap-2 w-full px-3 py-2 hover:bg-dark-600/50 transition-colors text-left"
            >
              {/* Cover thumb */}
              {item.meta_album_art_url ? (
                <img
                  src={api.getItemCoverUrl(item.id)}
                  alt=""
                  className="w-6 h-6 rounded object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-6 h-6 rounded bg-dark-500 flex items-center justify-center flex-shrink-0">
                  <Play className="w-2.5 h-2.5 text-gray-600" />
                </div>
              )}

              {/* Title + Artist */}
              <div className="min-w-0 flex-1">
                <div className="font-mono text-xs text-gray-200 truncate">
                  {item.meta_title || item.filename}
                </div>
                {item.meta_artist && (
                  <div className="font-mono text-[10px] text-gray-500 truncate">
                    {item.meta_artist}
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
