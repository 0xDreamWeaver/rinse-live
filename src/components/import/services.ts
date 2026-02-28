import type { MusicService } from '../../types';
import type { ComponentType } from 'react';
import { SpotifyIcon, TidalIcon, SoundCloudIcon, BeatportIcon } from './ServiceIcons';

// Icon props type
interface IconProps {
  className?: string;
  size?: number;
}

// Service configuration
export interface ServiceConfig {
  id: MusicService;
  name: string;
  description: string;
  Icon: ComponentType<IconProps>;
  color: string;
  enabled: boolean;
}

export const SERVICES: ServiceConfig[] = [
  {
    id: 'spotify',
    name: 'Spotify',
    description: 'Import playlists from Spotify',
    Icon: SpotifyIcon,
    color: '#1DB954',
    enabled: true,
  },
  {
    id: 'tidal',
    name: 'Tidal',
    description: 'Import playlists from Tidal',
    Icon: TidalIcon,
    color: '#00FFFF',
    enabled: false,
  },
  {
    id: 'soundcloud',
    name: 'SoundCloud',
    description: 'Import playlists from SoundCloud',
    Icon: SoundCloudIcon,
    color: '#FF5500',
    enabled: false,
  },
  {
    id: 'beatport',
    name: 'Beatport',
    description: 'Import charts from Beatport',
    Icon: BeatportIcon,
    color: '#94D500',
    enabled: false,
  },
];
