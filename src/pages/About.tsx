import { motion } from 'framer-motion';
import { Info, Music, Database, Disc, ExternalLink } from 'lucide-react';

interface ServiceAttribution {
  name: string;
  url: string;
  description: string;
  icon: typeof Music;
  license?: string;
}

const services: ServiceAttribution[] = [
  {
    name: 'Soulseek',
    url: 'https://www.slsknet.org/',
    description: 'Peer-to-peer file sharing network for music discovery and sharing',
    icon: Music,
  },
  {
    name: 'MusicBrainz',
    url: 'https://musicbrainz.org/',
    description: 'Open music encyclopedia for track metadata including artist, album, title, and more',
    icon: Database,
    license: 'CC0 / CC BY-NC-SA 3.0',
  },
  {
    name: 'Cover Art Archive',
    url: 'https://coverartarchive.org/',
    description: 'Free and open repository of album artwork, linked with MusicBrainz releases',
    icon: Disc,
  },
  {
    name: 'GetSongBPM',
    url: 'https://getsongbpm.com/',
    description: 'BPM and musical key database for DJs and music producers',
    icon: Disc,
    license: 'CC BY 4.0',
  },
];

export function About() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-2"
      >
        <h1 className="text-4xl font-display font-bold text-terminal-green">
          About Rinse
        </h1>
        <p className="text-gray-500 text-sm">
          Information about this application and the services it uses
        </p>
      </motion.div>

      {/* About Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="card-terminal"
      >
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 border-2 border-terminal-green flex items-center justify-center terminal-box-glow flex-shrink-0">
            <Info className="w-8 h-8 text-terminal-green" />
          </div>
          <div className="space-y-4">
            <div>
              <div className="text-xl font-display font-bold text-terminal-green">
                Rinse
              </div>
              <div className="text-sm text-gray-400 mt-1">
                A modern Soulseek client for music discovery and collection management
              </div>
            </div>
            <div className="text-sm text-gray-500 space-y-2">
              <p>
                Rinse is a self-hosted music download manager that connects to the Soulseek
                peer-to-peer network. It provides a clean, modern interface for searching,
                downloading, and organizing your music collection.
              </p>
              <p>
                Features include queue-based downloads, automatic metadata enrichment,
                file tag writing, and real-time progress tracking via WebSocket updates.
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Services Attribution */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="space-y-4"
      >
        <h2 className="text-2xl font-display font-bold text-terminal-green">
          Powered By
        </h2>
        <p className="text-sm text-gray-500">
          Rinse relies on the following services for its functionality. We gratefully
          acknowledge their contributions to the music community.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {services.map((service, index) => (
            <motion.a
              key={service.name}
              href={service.url}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 + index * 0.1 }}
              className="card-terminal hover:border-terminal-green transition-colors group"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 border border-dark-500 flex items-center justify-center group-hover:border-terminal-green transition-colors">
                  <service.icon className="w-6 h-6 text-gray-500 group-hover:text-terminal-green transition-colors" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-display font-bold text-terminal-green">
                      {service.name}
                    </span>
                    <ExternalLink className="w-3 h-3 text-gray-600 group-hover:text-terminal-green transition-colors" />
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    {service.description}
                  </div>
                  {service.license && (
                    <div className="text-xs font-mono text-gray-600 mt-2">
                      License: {service.license}
                    </div>
                  )}
                </div>
              </div>
            </motion.a>
          ))}
        </div>
      </motion.div>

      {/* Technical Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="card-terminal"
      >
        <h3 className="text-lg font-display font-bold text-terminal-green mb-4">
          Technical Details
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-gray-600 text-xs uppercase tracking-wider mb-1">Backend</div>
            <div className="text-gray-400 font-mono">Rust / Axum</div>
          </div>
          <div>
            <div className="text-gray-600 text-xs uppercase tracking-wider mb-1">Frontend</div>
            <div className="text-gray-400 font-mono">React / TypeScript</div>
          </div>
          <div>
            <div className="text-gray-600 text-xs uppercase tracking-wider mb-1">Database</div>
            <div className="text-gray-400 font-mono">SQLite</div>
          </div>
          <div>
            <div className="text-gray-600 text-xs uppercase tracking-wider mb-1">Protocol</div>
            <div className="text-gray-400 font-mono">Soulseek P2P</div>
          </div>
        </div>
      </motion.div>

      {/* Footer attribution */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="text-center text-xs text-gray-600 pt-4"
      >
        <p>
          BPM and key data provided by{' '}
          <a
            href="https://getsongbpm.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-terminal-green hover:underline"
          >
            GetSongBPM
          </a>
        </p>
      </motion.div>
    </div>
  );
}
