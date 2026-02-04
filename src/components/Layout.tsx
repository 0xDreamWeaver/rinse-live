import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { AudioPlayer } from './AudioPlayer';
import { useWebSocket } from '../hooks/useWebSocket';
import { motion } from 'framer-motion';
import { useAppStore } from '../store';

export function Layout() {
  // Connect to WebSocket for real-time updates
  useWebSocket();

  const currentTrack = useAppStore((state) => state.currentTrack);

  return (
    <div className="min-h-screen bg-dark-900 scan-effect">
      <Sidebar />

      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className={`ml-20 p-8 ${currentTrack ? 'pb-24' : ''}`}
      >
        <div className="max-w-7xl mx-auto">
          <Outlet />
        </div>
      </motion.main>

      {/* Audio Player */}
      <AudioPlayer />

      {/* Ambient grid background */}
      <div className="fixed inset-0 pointer-events-none opacity-5">
        <div className="grid-pattern w-full h-full" />
      </div>
    </div>
  );
}
