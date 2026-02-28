import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, X, SkipBack, SkipForward, Shuffle, Repeat, Repeat1 } from 'lucide-react';
import WaveSurfer from 'wavesurfer.js';
import { useAudioPlayer, useFrequencyData } from '../store';
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
    isPlaying,
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

  // Get setFrequencyData from the targeted frequency hook
  const { setFrequencyData } = useFrequencyData();

  const waveformRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const loopModeRef = useRef(loopMode);
  const playNextRef = useRef(playNext);

  // Sync guard to prevent infinite loops between WaveSurfer events and store
  const isSyncingRef = useRef(false);

  // Track isPlaying in a ref so the animation loop can check it
  const isPlayingRef = useRef(isPlaying);

  // Web Audio refs for frequency analysis
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const connectedElementRef = useRef<HTMLMediaElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);

  // Keep refs updated
  useEffect(() => {
    loopModeRef.current = loopMode;
  }, [loopMode]);

  useEffect(() => {
    playNextRef.current = playNext;
  }, [playNext]);

  // Keep isPlayingRef in sync - used by animation loop
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

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

  /**
   * Set up Web Audio API analyser for frequency visualization.
   * This connects to the WaveSurfer media element and extracts frequency data.
   *
   * CRITICAL: Must connect analyser to audioContext.destination or audio won't play!
   */
  const setupAudioAnalyser = useCallback(() => {
    if (!wavesurferRef.current) return;

    const mediaElement = wavesurferRef.current.getMediaElement();
    if (!mediaElement) return;

    // Already connected to this element - skip
    if (connectedElementRef.current === mediaElement && sourceNodeRef.current) {
      return;
    }

    try {
      // Create or reuse AudioContext
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }

      const audioContext = audioContextRef.current;

      // Resume if suspended (browsers require user gesture)
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }

      // Create analyser node
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      analyserRef.current = analyser;

      // Create source from media element (can only be done ONCE per element)
      const source = audioContext.createMediaElementSource(mediaElement);
      sourceNodeRef.current = source;
      connectedElementRef.current = mediaElement;

      // Connect: source -> analyser -> destination
      // CRITICAL: Must connect to destination or no audio will play!
      source.connect(analyser);
      analyser.connect(audioContext.destination);

      // Start the frequency update loop
      updateFrequencyData();
    } catch (err) {
      console.error('Failed to set up audio analyser:', err);
    }
  }, []);

  /**
   * Animation loop that reads frequency data from the analyser
   * and updates the store for PlayingIndicator to use.
   */
  const updateFrequencyData = useCallback(() => {
    if (!analyserRef.current) {
      animationFrameRef.current = null;
      return;
    }

    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const update = () => {
      // Stop the loop if analyser is gone or audio is paused
      if (!analyserRef.current || !isPlayingRef.current) {
        animationFrameRef.current = null;
        return;
      }

      analyser.getByteFrequencyData(dataArray);

      // With fftSize=256, we have 128 bins
      // At 44.1kHz sample rate, each bin ≈ 172 Hz
      // Use perceptually-weighted ranges:
      // - Low (bass): bins 0-5 (0-860 Hz) - where most bass energy is
      // - Mid: bins 6-25 (860-4300 Hz) - vocals, instruments
      // - High: bins 26-80 (4300-13700 Hz) - presence, air, cymbals

      // Get max value in each range (more responsive than average)
      let lowMax = 0, midMax = 0, highMax = 0;

      // Low: bins 0-5
      for (let i = 0; i <= 5 && i < bufferLength; i++) {
        lowMax = Math.max(lowMax, dataArray[i]);
      }

      // Mid: bins 6-25
      for (let i = 6; i <= 25 && i < bufferLength; i++) {
        midMax = Math.max(midMax, dataArray[i]);
      }

      // High: bins 26-80
      for (let i = 26; i <= 80 && i < bufferLength; i++) {
        highMax = Math.max(highMax, dataArray[i]);
      }

      // Normalize to 0-1 with boost for mid/high (they naturally have less energy)
      // Use square root scaling for better dynamic range (makes quiet parts more visible)
      const lowRaw = lowMax / 255;
      const midRaw = midMax / 255;
      const highRaw = highMax / 255;

      // Apply boost multipliers (reduced from before - was too sensitive)
      const lowBoost = 0.8;
      const midBoost = 1.2;
      const highBoost = 1.8;

      // Square root scaling spreads the dynamic range better
      // Then apply boost and clamp to 0-1
      const low = Math.min(1, Math.sqrt(lowRaw) * lowBoost);
      const mid = Math.min(1, Math.sqrt(midRaw) * midBoost);
      const high = Math.min(1, Math.sqrt(highRaw) * highBoost);

      setFrequencyData({ low, mid, high });

      animationFrameRef.current = requestAnimationFrame(update);
    };

    update();
  }, [setFrequencyData]);

  /**
   * Clean up animation frame loop
   */
  const cleanupAnimationFrame = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    // Reset frequency data when not playing
    setFrequencyData({ low: 0, mid: 0, high: 0 });
  }, [setFrequencyData]);

  // Initialize WaveSurfer when track changes
  useEffect(() => {
    if (!currentTrack || !waveformRef.current) return;

    // Clean up previous frequency animation
    cleanupAnimationFrame();

    // Destroy previous instance first - this stops the previous audio
    if (wavesurferRef.current) {
      wavesurferRef.current.stop();
      wavesurferRef.current.destroy();
      wavesurferRef.current = null;
    }

    // Clear the connected element ref since WaveSurfer creates a new one
    connectedElementRef.current = null;
    sourceNodeRef.current = null;

    setIsLoading(true);
    setIsReady(false);
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

      // Set up audio analyser AFTER ready
      setupAudioAnalyser();

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
      // If we initiated this play/pause from store sync, don't update store again
      if (isSyncingRef.current) {
        isSyncingRef.current = false;
        return;
      }
      resumePlayback();
    });

    wavesurfer.on('pause', () => {
      // If we initiated this play/pause from store sync, don't update store again
      if (isSyncingRef.current) {
        isSyncingRef.current = false;
        return;
      }
      pausePlayback();
    });

    wavesurfer.on('finish', () => {
      handleTrackEnd();
    });

    wavesurfer.on('error', (err) => {
      console.error('WaveSurfer error:', err);
      setIsLoading(false);
    });

    return () => {
      cleanupAnimationFrame();
      wavesurfer.stop();
      wavesurfer.destroy();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrack?.id, handleTrackEnd, setupAudioAnalyser, cleanupAnimationFrame]);

  // Sync store's isPlaying to WaveSurfer (global state control)
  // This allows other components (e.g., cover art pause button) to control playback
  useEffect(() => {
    if (!wavesurferRef.current || !isReady) return;

    const wavesurfer = wavesurferRef.current;
    const wsIsPlaying = wavesurfer.isPlaying();

    // Only sync if there's a mismatch
    if (isPlaying && !wsIsPlaying) {
      isSyncingRef.current = true;
      wavesurfer.play().catch((err) => {
        console.error('Play failed:', err);
        isSyncingRef.current = false;
      });
    } else if (!isPlaying && wsIsPlaying) {
      isSyncingRef.current = true;
      wavesurfer.pause();
    }
  }, [isPlaying, isReady]);

  // Clean up AudioContext on unmount
  useEffect(() => {
    return () => {
      cleanupAnimationFrame();
      // Don't close AudioContext - it can be reused
      // Source nodes are tied to elements that are destroyed anyway
    };
  }, [cleanupAnimationFrame]);

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
    cleanupAnimationFrame();
    if (wavesurferRef.current) {
      wavesurferRef.current.stop();
      wavesurferRef.current.destroy();
      wavesurferRef.current = null;
    }
    stopPlayback();
  }, [stopPlayback, cleanupAnimationFrame]);

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
            ) : isPlaying ? (
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
