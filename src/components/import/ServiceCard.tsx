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
  const iconSize = compact ? 20 : 48;

  // Coming Soon state
  if (!service.enabled) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`border border-dark-500 bg-dark-800/50 ${compact ? 'p-3' : 'p-4'} opacity-60`}
      >
        <div className="flex gap-3 items-center h-full">
          <div className="flex-1 min-w-0">
            <div className="font-bold text-gray-600 truncate font-display">
              {service.name}
            </div>
            {!compact && (
              <div className="text-xs text-gray-600 mt-0.5">
                {service.description}
              </div>
            )}
            {/* <div className="mt-1 font-mono text-xs text-yellow-600">
              Coming Soon
            </div> */}
          </div>
          <div
            className={`${compact ? 'w-10 h-10' : 'w-12 h-12'} flex items-center justify-center text-gray-600`}
          >
            <service.Icon size={iconSize} />
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
        className={`relative h-full border bg-dark-800/50`}
        style={{ borderColor: service.color }}
      >
        <div className="flex absolute top-0 right-0 bottom-0 left-0 z-10 justify-center items-center w-full h-full opacity-0 backdrop-blur-sm transition-opacity hover:opacity-100 bg-dark-800/50">
          <button
            onClick={onDisconnect}
            disabled={isLoading}
            className="hover:bg-red-600/10 w-full h-full btn-terminal-sm flex justify-center items-center gap-1.5 text-gray-500 border-dark-500 hover:text-red-500 hover:border-red-500/50"
          >
            {isDisconnecting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="font-medium text-md">
                  Disconnecting
                </span>
              </>
            ) : (
              <>
                <Unlink className="w-5 h-5" />
                <span className="font-medium text-md">
                  Disconnect
                </span>
              </>
            )}
          </button>
          <button
            onClick={onBrowse}
            className="hover:bg-terminal-green/10 w-full h-full flex justify-center items-center btn-terminal-sm gap-1.5 text-gray-500 hover:text-terminal-green"
          >
            <FolderOpen className="w-5 h-5" />
            <span className="font-medium text-md">
              Browse
            </span>
          </button>
        </div>
        <div className={`flex gap-3 items-center h-full ${compact ? 'p-3' : 'p-4'}`}>
          <div className="flex-1 min-w-0">
            <div className="flex gap-2 items-center">
              <span
                className="font-bold truncate font-display"
                style={{ color: service.color }}
              >
                {service.name}
              </span>
              <span className="text-xs px-1.5 py-0.5 bg-terminal-green/20 text-terminal-green rounded shrink-0">
                Connected
              </span>
            </div>
            {connection?.username && (
              <div className="flex gap-2 items-center text-md text-gray-500 font-mono mt-0.5 truncate">
                {connection.username}
              </div>
            )}
          </div>
          <div
            className={`${compact ? 'w-10 h-10' : 'w-12 h-12'} flex items-center justify-center`}
            style={{ color: service.color }}
          >
            <service.Icon size={iconSize} />
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
      className={`relative border border-dark-500 bg-dark-800/50 ${compact ? 'p-3' : 'p-4'} opacity-60`}
    >
      <div className="flex absolute top-0 right-0 bottom-0 left-0 z-10 justify-center items-center w-full h-full opacity-0 backdrop-blur-sm transition-opacity hover:opacity-100 bg-dark-800/50">
        <button
          onClick={onConnect}
          disabled={isLoading}
          className="hover:bg-terminal-green/10 w-full h-full flex justify-center items-center btn-terminal-sm gap-1.5 text-gray-500 hover:text-terminal-green"
        >
          {isConnecting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <LinkIcon className="w-3.5 h-3.5" />
          )}
          <span className="font-medium text-md">
            Connect
          </span>
        </button>
      </div>
      <div className="flex gap-3 items-center h-full">
        <div className="flex-1 min-w-0">
          <div className="font-bold text-gray-600 truncate font-display">
            {service.name}
          </div>
          {!compact && (
            <div className="text-xs text-gray-600 mt-0.5">
              {service.description}
            </div>
          )}
          {/* <div className="mt-1 font-mono text-xs text-yellow-600">
            Coming Soon
          </div> */}
        </div>
        <div
          className={`${compact ? 'w-10 h-10' : 'w-12 h-12'} flex items-center justify-center text-gray-600`}
        >
          <service.Icon size={iconSize} />
        </div>
      </div>
    </motion.div>
  );
}
