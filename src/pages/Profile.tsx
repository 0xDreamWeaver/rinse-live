import { motion } from 'framer-motion';
import { User, Zap, Settings } from 'lucide-react';

export function Profile() {
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
              Guest User
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            {
              name: 'Tidal',
              description: 'Import playlists from Tidal',
              icon: Zap,
              status: 'Coming Soon',
            },
            {
              name: 'Beatport',
              description: 'Import charts from Beatport',
              icon: Zap,
              status: 'Coming Soon',
            },
            {
              name: 'Goodreads',
              description: 'Import reading lists',
              icon: Zap,
              status: 'Coming Soon',
            },
            {
              name: 'Spotify',
              description: 'Import playlists from Spotify',
              icon: Zap,
              status: 'Coming Soon',
            },
          ].map((service, index) => (
            <motion.div
              key={service.name}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 + index * 0.1 }}
              className="card-terminal opacity-50 cursor-not-allowed"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 border border-dark-500 flex items-center justify-center">
                  <service.icon className="w-6 h-6 text-gray-600" />
                </div>
                <div className="flex-1">
                  <div className="font-display font-bold text-gray-600">
                    {service.name}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    {service.description}
                  </div>
                  <div className="text-xs font-mono text-yellow-600 mt-2">
                    {service.status}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
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
