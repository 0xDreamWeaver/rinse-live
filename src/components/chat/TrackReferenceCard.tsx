import { useQuery } from '@tanstack/react-query';
import { Play, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { useAudioPlayer } from '../../store';

interface TrackReferenceCardProps {
  itemId: number;
}

export function TrackReferenceCard({ itemId }: TrackReferenceCardProps) {
  const navigate = useNavigate();
  const { playTrack } = useAudioPlayer();

  const { data: item, isLoading, isError } = useQuery({
    queryKey: ['item', itemId],
    queryFn: () => api.getItem(itemId),
    staleTime: 1000 * 60 * 10,
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-1 px-2 py-0.5 my-1 rounded bg-dark-600/50 border border-dark-500 text-[11px] font-mono text-gray-500">
        Loading track...
      </div>
    );
  }

  if (isError || !item) {
    return (
      <div className="flex items-center gap-1 px-2 py-0.5 my-1 rounded bg-dark-600/50 border border-dark-500 text-[11px] font-mono text-gray-500">
        <AlertCircle className="w-3 h-3" />
        Track unavailable
      </div>
    );
  }

  const title = item.meta_title || item.filename;
  const artist = item.meta_artist;
  const coverUrl = item.meta_album_art_url;

  return (
    <div
      className="flex items-center gap-2 px-2 py-1 my-1 rounded bg-dark-600/80 border border-dark-500 hover:border-terminal-green/50 transition-colors cursor-pointer group"
      onClick={(e) => {
        e.stopPropagation();
        navigate(`/items/${itemId}`);
      }}
    >
      {/* Cover art */}
      {coverUrl ? (
        <img
          src={api.getItemCoverUrl(itemId)}
          alt=""
          className="w-8 h-8 rounded object-cover flex-shrink-0"
        />
      ) : (
        <div className="w-8 h-8 rounded bg-dark-500 flex items-center justify-center flex-shrink-0">
          <Play className="w-3 h-3 text-gray-600" />
        </div>
      )}

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="font-mono text-xs text-gray-200 truncate max-w-[180px]">
          {title}
        </div>
        {artist && (
          <div className="font-mono text-[10px] text-gray-500 truncate max-w-[180px]">
            {artist}
          </div>
        )}
      </div>

      {/* Play button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          playTrack(item);
        }}
        className="flex-shrink-0 p-1 text-gray-500 hover:text-terminal-green transition-colors"
        title="Play"
      >
        <Play className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
