import { motion } from 'framer-motion';
import { Loader2, LinkIcon, Unlink, FolderOpen } from 'lucide-react';
import type { OAuthConnectionStatus } from '../../types';
import type { ServiceConfig } from './services';
export { SERVICES } from './services';
export type { ServiceConfig } from './services';

interface ServiceCardProps {
  service: ServiceConfig;
  connection: OAuthConnectionStatus | null;
  onConnect: () => void;
  onDisconnect: () => void;
  onBrowse: () => void;
  isConnecting: boolean;
  isDisconnecting: boolean;
  compact?: boolean;
}

export function ServiceCard({
  service,
  connection,
  onConnect,
  onDisconnect,
  onBrowse,
  isConnecting,
  isDisconnecting,
  compact = false,
}: ServiceCardProps) {
  const isConnected = connection?.connected ?? false;
  const isLoading = isConnecting || isDisconnecting;
  const iconSize = compact ? 20 : 24;

  // Coming Soon state
  if (!service.enabled) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`border border-dark-500 bg-dark-800/50 ${compact ? 'p-3' : 'p-4'} opacity-60`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`${compact ? 'w-10 h-10' : 'w-12 h-12'} border border-dark-500 flex items-center justify-center text-gray-600`}
          >
            <service.Icon size={iconSize} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-display font-bold text-gray-600 truncate">
              {service.name}
            </div>
            {!compact && (
              <div className="text-xs text-gray-600 mt-0.5">
                {service.description}
              </div>
            )}
            <div className="text-xs font-mono text-yellow-600 mt-1">
              Coming Soon
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // Connected state
  if (isConnected) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`border bg-dark-800/50 ${compact ? 'p-3' : 'p-4'}`}
        style={{ borderColor: service.color + '40' }}
      >
        <div className="flex items-center gap-3">
          <div
            className={`${compact ? 'w-10 h-10' : 'w-12 h-12'} border flex items-center justify-center`}
            style={{ borderColor: service.color, color: service.color }}
          >
            <service.Icon size={iconSize} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span
                className="font-display font-bold truncate"
                style={{ color: service.color }}
              >
                {service.name}
              </span>
              <span className="text-xs px-1.5 py-0.5 bg-terminal-green/20 text-terminal-green rounded shrink-0">
                Connected
              </span>
            </div>
            {connection?.username && (
              <div className="text-xs text-gray-500 font-mono mt-0.5 truncate">
                {connection.username}
              </div>
            )}
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={onBrowse}
              className="btn-terminal-sm flex items-center gap-1.5"
              style={{ borderColor: service.color, color: service.color }}
            >
              <FolderOpen className="w-3.5 h-3.5" />
              {!compact && 'Browse'}
            </button>
            <button
              onClick={onDisconnect}
              disabled={isLoading}
              className="btn-terminal-sm flex items-center gap-1.5 text-gray-500 border-dark-500 hover:text-red-500 hover:border-red-500/50"
            >
              {isDisconnecting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Unlink className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  // Not connected state
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`border border-dark-500 bg-dark-800/50 ${compact ? 'p-3' : 'p-4'}`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`${compact ? 'w-10 h-10' : 'w-12 h-12'} border border-dark-500 flex items-center justify-center text-gray-500`}
        >
          <service.Icon size={iconSize} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-display font-bold text-terminal-green truncate">
            {service.name}
          </div>
          {!compact && (
            <div className="text-xs text-gray-500 mt-0.5">
              {service.description}
            </div>
          )}
        </div>
        <button
          onClick={onConnect}
          disabled={isLoading}
          className="btn-terminal-sm flex items-center gap-1.5 shrink-0"
        >
          {isConnecting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <LinkIcon className="w-3.5 h-3.5" />
          )}
          Connect
        </button>
      </div>
    </motion.div>
  );
}
