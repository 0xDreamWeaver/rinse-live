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
      className="border border-dark-500 bg-dark-800/50 hover:border-dark-400 transition-colors group"
    >
      <div className="flex gap-4 p-4">
        {/* Cover Art */}
        <div className="w-20 h-20 flex-shrink-0 bg-dark-700 border border-dark-600">
          {playlist.image_url ? (
            <img
              src={playlist.image_url}
              alt={playlist.name}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Music className="w-8 h-8 text-gray-600" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h3 className="font-display font-bold text-terminal-green truncate">
            {playlist.name}
          </h3>

          {playlist.description && (
            <p className="text-xs text-gray-500 mt-1 line-clamp-2">
              {playlist.description}
            </p>
          )}

          <div className="flex items-center gap-4 mt-2 text-xs font-mono text-gray-400">
            <span className="flex items-center gap-1">
              <Music className="w-3 h-3" />
              {playlist.track_count} tracks
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatEstimatedDuration(playlist.track_count)}
            </span>
          </div>

          {/* Owner */}
          <div className="text-xs text-gray-500 mt-1">
            by {playlist.owner_name}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 shrink-0">
          <button
            onClick={onView}
            className="btn-terminal-sm flex items-center gap-1.5 text-xs"
          >
            <Eye className="w-3.5 h-3.5" />
            View
          </button>
          <button
            onClick={onImport}
            disabled={isImporting}
            className="btn-terminal-sm flex items-center gap-1.5 text-xs bg-terminal-green/10 border-terminal-green text-terminal-green hover:bg-terminal-green/20"
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
