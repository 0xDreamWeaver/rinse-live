import { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Settings, Loader2, LinkIcon, Unlink, ExternalLink } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../store';
import { api } from '../lib/api';
import type { MusicService, OAuthConnectionStatus } from '../types';

// Service configuration
interface ServiceConfig {
  id: MusicService;
  name: string;
  description: string;
  icon: string; // Emoji or icon identifier
  color: string;
  enabled: boolean;
}

const SERVICES: ServiceConfig[] = [
  {
    id: 'spotify',
    name: 'Spotify',
    description: 'Import playlists from Spotify',
    icon: '🎵',
    color: '#1DB954',
    enabled: true,
  },
  {
    id: 'tidal',
    name: 'Tidal',
    description: 'Import playlists from Tidal',
    icon: '🌊',
    color: '#00FFFF',
    enabled: false,
  },
  {
    id: 'soundcloud',
    name: 'SoundCloud',
    description: 'Import playlists from SoundCloud',
    icon: '☁️',
    color: '#FF5500',
    enabled: false,
  },
  {
    id: 'beatport',
    name: 'Beatport',
    description: 'Import charts from Beatport',
    icon: '🎧',
    color: '#94D500',
    enabled: false,
  },
];

interface ServiceCardProps {
  service: ServiceConfig;
  connection: OAuthConnectionStatus | null;
  onConnect: () => void;
  onDisconnect: () => void;
  isConnecting: boolean;
  isDisconnecting: boolean;
}

function ServiceCard({
  service,
  connection,
  onConnect,
  onDisconnect,
  isConnecting,
  isDisconnecting,
}: ServiceCardProps) {
  const isConnected = connection?.connected ?? false;
  const isLoading = isConnecting || isDisconnecting;

  if (!service.enabled) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="card-terminal opacity-50"
      >
        <div className="flex items-start gap-4">
          <div
            className="w-12 h-12 border border-dark-500 flex items-center justify-center text-2xl"
          >
            {service.icon}
          </div>
          <div className="flex-1">
            <div className="font-display font-bold text-gray-600">
              {service.name}
            </div>
            <div className="text-sm text-gray-600 mt-1">
              {service.description}
            </div>
            <div className="text-xs font-mono text-yellow-600 mt-2">
              Coming Soon
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="card-terminal"
    >
      <div className="flex items-start gap-4">
        <div
          className="w-12 h-12 border flex items-center justify-center text-2xl"
          style={{ borderColor: isConnected ? service.color : 'var(--color-dark-500)' }}
        >
          {service.icon}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span
              className="font-display font-bold"
              style={{ color: isConnected ? service.color : 'var(--color-terminal-green)' }}
            >
              {service.name}
            </span>
            {isConnected && (
              <span className="text-xs px-2 py-0.5 bg-terminal-green/20 text-terminal-green rounded">
                Connected
              </span>
            )}
          </div>
          <div className="text-sm text-gray-500 mt-1">
            {service.description}
          </div>

          {isConnected && connection?.username && (
            <div className="text-xs text-gray-400 mt-2 font-mono">
              Logged in as: {connection.username}
            </div>
          )}

          <div className="flex gap-2 mt-3">
            {isConnected ? (
              <>
                <button
                  onClick={onDisconnect}
                  disabled={isLoading}
                  className="btn-terminal-sm flex items-center gap-1.5 text-red-500 border-red-500/50 hover:bg-red-500/10"
                >
                  {isDisconnecting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Unlink className="w-3.5 h-3.5" />
                  )}
                  Disconnect
                </button>
                <button
                  className="btn-terminal-sm flex items-center gap-1.5"
                  onClick={() => {/* TODO: Navigate to playlist browser */}}
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Browse Playlists
                </button>
              </>
            ) : (
              <button
                onClick={onConnect}
                disabled={isLoading}
                className="btn-terminal-sm flex items-center gap-1.5"
              >
                {isConnecting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <LinkIcon className="w-3.5 h-3.5" />
                )}
                Connect
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function Profile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [connectingService, setConnectingService] = useState<MusicService | null>(null);

  // Fetch all OAuth connection statuses
  const { data: connections, isLoading: isLoadingConnections } = useQuery({
    queryKey: ['oauth-connections'],
    queryFn: () => api.getOAuthConnections(),
  });

  // Disconnect mutation
  const disconnectMutation = useMutation({
    mutationFn: (service: MusicService) => api.disconnectOAuth(service),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['oauth-connections'] });
    },
  });

  const handleConnect = async (service: MusicService) => {
    setConnectingService(service);
    try {
      const response = await api.startOAuthConnect(service);
      // Redirect to the OAuth authorization URL
      window.location.href = response.auth_url;
    } catch (error) {
      console.error('Failed to start OAuth:', error);
      setConnectingService(null);
    }
  };

  const handleDisconnect = (service: MusicService) => {
    disconnectMutation.mutate(service);
  };

  const getConnectionForService = (serviceId: MusicService): OAuthConnectionStatus | null => {
    if (!connections) return null;
    return connections.find(c => c.service === serviceId) || null;
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-2"
      >
        <h1 className="text-4xl font-display font-bold text-terminal-green">
          Profile
        </h1>
        <p className="text-gray-500 text-sm">
          Connect external services and manage your account
        </p>
      </motion.div>

      {/* User Info Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="card-terminal"
      >
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 border-2 border-terminal-green flex items-center justify-center terminal-box-glow">
            <User className="w-8 h-8 text-terminal-green" />
          </div>
          <div>
            <div className="text-xl font-display font-bold text-terminal-green">
              {user?.username || 'Guest User'}
            </div>
            <div className="text-sm text-gray-500">
              Connected to Soulseek network
            </div>
          </div>
        </div>
      </motion.div>

      {/* External Services */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="space-y-4"
      >
        <h2 className="text-2xl font-display font-bold text-terminal-green">
          External Services
        </h2>
        <p className="text-sm text-gray-500">
          Connect external services to import playlists and lists automatically
        </p>

        {isLoadingConnections ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 text-terminal-green animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {SERVICES.map((service, index) => (
              <motion.div
                key={service.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 + index * 0.1 }}
              >
                <ServiceCard
                  service={service}
                  connection={getConnectionForService(service.id)}
                  onConnect={() => handleConnect(service.id)}
                  onDisconnect={() => handleDisconnect(service.id)}
                  isConnecting={connectingService === service.id}
                  isDisconnecting={disconnectMutation.isPending && disconnectMutation.variables === service.id}
                />
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Settings */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="card-terminal opacity-50 cursor-not-allowed"
      >
        <div className="flex items-center gap-3">
          <Settings className="w-6 h-6 text-gray-600" />
          <div>
            <div className="font-display font-bold text-gray-600">Settings</div>
            <div className="text-sm text-gray-600 mt-1">
              Configure your preferences
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
