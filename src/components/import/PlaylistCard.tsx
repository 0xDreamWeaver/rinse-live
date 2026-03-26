import { motion } from 'framer-motion';
import { Music, Clock, Eye, Download, Loader2 } from 'lucide-react';
import type { ExternalPlaylist } from '../../types';

interface PlaylistCardProps {
  playlist: ExternalPlaylist;
  onView: () => void;
  onImport: () => void;
  isImporting?: boolean;
  index?: number;
}

// Format duration from total track count (rough estimate: avg 3.5 min per track)
function formatEstimatedDuration(trackCount: number): string {
  const avgMinutes = 3.5;
  const totalMinutes = trackCount * avgMinutes;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.round(totalMinutes % 60);

  if (hours === 0) {
    return `~${minutes} min`;
  }
  return `~${hours}h ${minutes}m`;
}

export function PlaylistCard({
  playlist,
  onView,
  onImport,
  isImporting = false,
  index = 0,
}: PlaylistCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="relative border transition-colors border-dark-500 bg-dark-800/50 hover:border-dark-400 group"
    >
      <div className="flex gap-4 p-4">
        {/* Cover Art */}
        <div className="flex-shrink-0 w-20 h-20 border bg-dark-700 border-dark-600">
          {playlist.image_url ? (
            <img
              src={playlist.image_url}
              alt={playlist.name}
              className="object-cover w-full h-full"
              loading="lazy"
            />
          ) : (
            <div className="flex justify-center items-center w-full h-full">
              <Music className="w-8 h-8 text-gray-600" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h3 className="font-bold truncate font-display text-terminal-green">
            {playlist.name}
          </h3>

          {playlist.description && (
            <p className="mt-1 text-xs text-gray-500 line-clamp-2">
              {playlist.description}
            </p>
          )}

          <div className="flex gap-4 items-center mt-2 font-mono text-xs text-gray-400">
            <span className="flex gap-1 items-center">
              <Music className="w-3 h-3" />
              {playlist.track_count} tracks
            </span>
            <span className="flex gap-1 items-center">
              <Clock className="w-3 h-3" />
              {formatEstimatedDuration(playlist.track_count)}
            </span>
          </div>

          {/* Owner */}
          <div className="mt-1 text-xs text-gray-500">
            by {playlist.owner_name}
          </div>
        </div>

        {/* Actions */}
        <div className="flex absolute right-0 bottom-0 flex-row p-2 shrink-0">
          <button
            onClick={onView}
            className="px-2 py-1 btn-terminal-sm flex items-center gap-1.5 text-xs hover:bg-white/5"
          >
            <Eye className="w-3.5 h-3.5" />
            View
          </button>
          <button
            onClick={onImport}
            disabled={isImporting}
            className="px-2 py-1 btn-terminal-sm flex items-center gap-1.5 text-xs bg-terminal-green/10 border-terminal-green text-terminal-green hover:bg-terminal-green/20"
          >
            {isImporting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            Import
          </button>
        </div>
      </div>
    </motion.div>
  );
}
