import { useFrequencyData } from '../store';

interface PlayingIndicatorProps {
  size?: 'sm' | 'md';
}

/**
 * Animated playing indicator that reacts to audio frequencies.
 * Shows 3 bars (low, mid, high frequencies) that animate based on
 * the frequencyData from the audio player store.
 *
 * Uses a targeted store selector (useFrequencyData) to only re-render
 * when frequencyData or isPlaying changes, avoiding re-renders in parent components.
 */
export function PlayingIndicator({ size = 'md' }: PlayingIndicatorProps) {
  const { frequencyData, isPlaying } = useFrequencyData();

  // Size configurations
  const sizeConfig = {
    sm: { container: 'h-3', bar: 'w-0.5' },
    md: { container: 'h-4', bar: 'w-1' },
  };

  const config = sizeConfig[size];

  // Calculate bar heights based on frequency data
  // When playing with frequency data, use dynamic heights
  // When paused or no data, use static heights
  const getBarHeight = (value: number, defaultHeight: number) => {
    if (!isPlaying) {
      // Static heights when paused
      return `${defaultHeight}%`;
    }
    // Dynamic heights: minimum 20%, maximum 100%
    const height = Math.max(0.2, Math.min(1, value)) * 100;
    return `${height}%`;
  };

  // Default heights when no frequency data (matches original CSS animation look)
  const defaultHeights = [60, 100, 40];

  const bars = [
    { value: frequencyData.low, default: defaultHeights[0] },
    { value: frequencyData.mid, default: defaultHeights[1] },
    { value: frequencyData.high, default: defaultHeights[2] },
  ];

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded pointer-events-none">
      <div className={`flex gap-0.5 items-end ${config.container}`}>
        {bars.map((bar, index) => (
          <span
            key={index}
            className={`${config.bar} bg-terminal-green transition-all duration-75`}
            style={{ height: getBarHeight(bar.value, bar.default) }}
          />
        ))}
      </div>
    </div>
  );
}
