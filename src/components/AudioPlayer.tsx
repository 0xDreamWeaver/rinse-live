import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, X } from 'lucide-react';
import WaveSurfer from 'wavesurfer.js';
import { useAudioPlayer } from '../store';
import { api } from '../lib/api';

function formatTime(seconds: number): string {
  if (!seconds || !isFinite(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function AudioPlayer() {
  const {
    currentTrack,
    stopPlayback,
    pausePlayback,
    resumePlayback,
  } = useAudioPlayer();

  const waveformRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [localIsPlaying, setLocalIsPlaying] = useState(false);

  // Initialize WaveSurfer when track changes
  useEffect(() => {
    if (!currentTrack || !waveformRef.current) return;

    // Destroy previous instance first - this stops the previous audio
    if (wavesurferRef.current) {
      wavesurferRef.current.stop();
      wavesurferRef.current.destroy();
      wavesurferRef.current = null;
    }

    setIsLoading(true);
    setIsReady(false);
    setLocalIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);

    const wavesurfer = WaveSurfer.create({
      container: waveformRef.current,
      waveColor: '#4a5568',
      progressColor: '#7aca5e',
      cursorColor: '#7aca5e',
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
      height: 48,
      normalize: true,
    });

    wavesurferRef.current = wavesurfer;

    // Load the audio using api directly to avoid dependency issues
    const streamUrl = api.getItemStreamUrl(currentTrack.id);
    wavesurfer.load(streamUrl);

    // Event handlers
    wavesurfer.on('ready', () => {
      setIsLoading(false);
      setIsReady(true);
      setDuration(wavesurfer.getDuration());
      // Auto-play when ready
      wavesurfer.play().catch((err) => {
        console.error('Autoplay failed:', err);
      });
    });

    wavesurfer.on('audioprocess', () => {
      setCurrentTime(wavesurfer.getCurrentTime());
    });

    wavesurfer.on('seeking', () => {
      setCurrentTime(wavesurfer.getCurrentTime());
    });

    wavesurfer.on('play', () => {
      setLocalIsPlaying(true);
    });

    wavesurfer.on('pause', () => {
      setLocalIsPlaying(false);
    });

    wavesurfer.on('finish', () => {
      setLocalIsPlaying(false);
    });

    wavesurfer.on('error', (err) => {
      console.error('WaveSurfer error:', err);
      setIsLoading(false);
    });

    return () => {
      wavesurfer.stop();
      wavesurfer.destroy();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrack?.id]);

  // Sync local playing state to store (for other components to know if playing)
  useEffect(() => {
    if (localIsPlaying) {
      resumePlayback();
    } else {
      pausePlayback();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localIsPlaying]);

  const handlePlayPause = useCallback(() => {
    if (!wavesurferRef.current || !isReady) return;

    if (wavesurferRef.current.isPlaying()) {
      wavesurferRef.current.pause();
    } else {
      wavesurferRef.current.play().catch((err) => {
        console.error('Play failed:', err);
      });
    }
  }, [isReady]);

  const handleClose = useCallback(() => {
    if (wavesurferRef.current) {
      wavesurferRef.current.stop();
      wavesurferRef.current.destroy();
      wavesurferRef.current = null;
    }
    stopPlayback();
  }, [stopPlayback]);

  if (!currentTrack) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-0 left-0 right-0 z-40 ml-20 border-t bg-dark-800 border-dark-500"
      >
        <div className="flex items-center gap-4 px-6 py-3">
          {/* Play/Pause Button */}
          <button
            onClick={handlePlayPause}
            disabled={isLoading}
            className="flex items-center justify-center w-12 h-12 transition-colors rounded-full bg-terminal-green hover:bg-terminal-green-dark disabled:opacity-50"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 rounded-full border-dark-900 border-t-transparent animate-spin" />
            ) : localIsPlaying ? (
              <Pause className="w-5 h-5 text-dark-900" />
            ) : (
              <Play className="w-5 h-5 ml-0.5 text-dark-900" />
            )}
          </button>

          {/* Track Info */}
          <div className="flex-shrink-0 w-48 min-w-0">
            <div className="font-mono text-sm truncate text-terminal-green">
              {currentTrack.filename}
            </div>
            {currentTrack.source_username && (
              <div className="text-xs text-gray-500 truncate">
                {currentTrack.source_username}
              </div>
            )}
          </div>

          {/* Time Display */}
          <div className="flex-shrink-0 font-mono text-xs text-gray-400">
            {formatTime(currentTime)}
          </div>

          {/* Waveform */}
          <div className="flex-1 min-w-0" ref={waveformRef}>
            {isLoading && (
              <div className="flex items-center justify-center h-12">
                <div className="font-mono text-sm text-gray-500 animate-pulse">
                  Loading waveform...
                </div>
              </div>
            )}
          </div>

          {/* Duration */}
          <div className="flex-shrink-0 font-mono text-xs text-gray-400">
            {formatTime(duration)}
          </div>

          {/* Close Button */}
          <button
            onClick={handleClose}
            className="p-2 text-gray-500 transition-colors hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
