import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, X, SkipBack, SkipForward, Shuffle, Repeat, Repeat1 } from 'lucide-react';
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
    playNext,
    playPrevious,
    shuffleMode,
    loopMode,
    toggleShuffle,
    cycleLoopMode,
    playbackQueue,
    playbackHistory,
    queueIndex,
  } = useAudioPlayer();

  const waveformRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const loopModeRef = useRef(loopMode);
  const playNextRef = useRef(playNext);

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [localIsPlaying, setLocalIsPlaying] = useState(false);

  // Keep refs updated
  useEffect(() => {
    loopModeRef.current = loopMode;
  }, [loopMode]);

  useEffect(() => {
    playNextRef.current = playNext;
  }, [playNext]);

  // Handle track end based on loop mode
  const handleTrackEnd = useCallback(() => {
    const currentLoopMode = loopModeRef.current;

    if (currentLoopMode === 'one') {
      // Loop single track - replay from start
      if (wavesurferRef.current) {
        wavesurferRef.current.seekTo(0);
        wavesurferRef.current.play().catch((err) => {
          console.error('Replay failed:', err);
        });
      }
    } else {
      // Loop all or off - try to play next
      playNextRef.current();
    }
  }, []);

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
      handleTrackEnd();
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
  }, [currentTrack?.id, handleTrackEnd]);

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

  const handlePrevious = useCallback(() => {
    // If we're more than 3 seconds into the track, restart it instead of going back
    if (wavesurferRef.current && currentTime > 3) {
      wavesurferRef.current.seekTo(0);
    } else {
      playPrevious();
    }
  }, [currentTime, playPrevious]);

  const handleNext = useCallback(() => {
    playNext();
  }, [playNext]);

  // Check if we have tracks to navigate to
  const canGoPrevious = playbackHistory.length > 0 || queueIndex > 0 || currentTime > 3;
  const canGoNext = playbackQueue.length > 1 || loopMode === 'all' || shuffleMode;

  if (!currentTrack) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-0 left-0 right-0 z-40 ml-20 border-t bg-dark-800 border-dark-500 max-h-[72px] overflow-hidden"
      >
        <div className="flex items-center gap-3 px-4 py-3 h-[72px]">
          {/* Shuffle Button */}
          <button
            onClick={toggleShuffle}
            className={`p-2 transition-colors ${
              shuffleMode
                ? 'text-terminal-green'
                : 'text-gray-500 hover:text-gray-300'
            }`}
            title={shuffleMode ? 'Shuffle on' : 'Shuffle off'}
          >
            <Shuffle className="w-4 h-4" />
          </button>

          {/* Previous Button */}
          <button
            onClick={handlePrevious}
            disabled={!canGoPrevious}
            className="p-2 text-gray-400 transition-colors hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
            title="Previous"
          >
            <SkipBack className="w-5 h-5" />
          </button>

          {/* Play/Pause Button */}
          <button
            onClick={handlePlayPause}
            disabled={isLoading}
            className="flex items-center justify-center w-10 h-10 transition-colors rounded-full bg-terminal-green hover:bg-terminal-green-dark disabled:opacity-50"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 rounded-full border-dark-900 border-t-transparent animate-spin" />
            ) : localIsPlaying ? (
              <Pause className="w-4 h-4 text-dark-900" />
            ) : (
              <Play className="w-4 h-4 ml-0.5 text-dark-900" />
            )}
          </button>

          {/* Next Button */}
          <button
            onClick={handleNext}
            disabled={!canGoNext}
            className="p-2 text-gray-400 transition-colors hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
            title="Next"
          >
            <SkipForward className="w-5 h-5" />
          </button>

          {/* Loop Button */}
          <button
            onClick={cycleLoopMode}
            className={`p-2 transition-colors ${
              loopMode !== 'off'
                ? 'text-terminal-green'
                : 'text-gray-500 hover:text-gray-300'
            }`}
            title={
              loopMode === 'off'
                ? 'Loop off'
                : loopMode === 'one'
                ? 'Loop one'
                : 'Loop all'
            }
          >
            {loopMode === 'one' ? (
              <Repeat1 className="w-4 h-4" />
            ) : (
              <Repeat className="w-4 h-4" />
            )}
          </button>

          {/* Track Info */}
          <div className="flex-shrink-0 w-44 min-w-0 ml-2">
            <div className="font-mono text-sm truncate text-terminal-green">
              {currentTrack.meta_title || currentTrack.filename}
            </div>
            <div className="text-xs text-gray-500 truncate">
              {currentTrack.meta_artist || currentTrack.source_username || 'Unknown Artist'}
            </div>
          </div>

          {/* Time Display */}
          <div className="flex-shrink-0 font-mono text-xs text-gray-400">
            {formatTime(currentTime)}
          </div>

          {/* Waveform */}
          <div className="relative flex-1 min-w-0 h-12 overflow-hidden" ref={waveformRef}>
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center">
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

          {/* Queue indicator */}
          {playbackQueue.length > 1 && (
            <div className="flex-shrink-0 px-2 py-1 font-mono text-xs rounded text-terminal-green bg-dark-700">
              {queueIndex + 1}/{playbackQueue.length}
            </div>
          )}

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
