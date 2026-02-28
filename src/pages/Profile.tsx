import { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Settings, Loader2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../store';
import { api } from '../lib/api';
import { ServiceCard, SERVICES } from '../components/import/ServiceCard';
import type { MusicService, OAuthConnectionStatus } from '../types';

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
      // eslint-disable-next-line react-hooks/immutability
      window.location.href = response.auth_url;
    } catch (error) {
      console.error('Failed to start OAuth:', error);
      setConnectingService(null);
    }
  };

  const handleDisconnect = (service: MusicService) => {
    disconnectMutation.mutate(service);
  };

  const handleBrowsePlaylists = (service: MusicService) => {
    // TODO: Navigate to Import page with playlist browser open
    console.log('Browse playlists for', service);
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
                  onBrowse={() => handleBrowsePlaylists(service.id)}
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
