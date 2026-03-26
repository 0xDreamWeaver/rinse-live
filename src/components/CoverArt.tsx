import { useState } from 'react';
import { Music } from 'lucide-react';

interface CoverArtProps {
  itemId: number;
  albumArtUrl?: string | null;
  size?: 'thumb' | 'full';
  alt?: string;
  className?: string;
  iconClassName?: string;
}

/**
 * Cover art image with fallback chain:
 * 1. Try cached proxy endpoint (/api/items/:id/cover)
 * 2. On error, try original external URL
 * 3. On error, show Music icon placeholder
 */
export function CoverArt({
  itemId,
  albumArtUrl,
  size = 'thumb',
  alt = '',
  className = 'w-full h-full',
  iconClassName = 'w-5 h-5 text-gray-500',
}: CoverArtProps) {
  const proxyUrl = `/api/items/${itemId}/cover?size=${size}`;
  const [src, setSrc] = useState<string | null>(albumArtUrl ? proxyUrl : null);
  const [fallbackAttempted, setFallbackAttempted] = useState(false);

  const handleError = () => {
    if (!fallbackAttempted && albumArtUrl) {
      // Try the original external URL as fallback
      setFallbackAttempted(true);
      setSrc(albumArtUrl);
    } else {
      // Both failed — show placeholder
      setSrc(null);
    }
  };

  if (!src) {
    return (
      <div className={`flex justify-center items-center rounded bg-dark-600 ${className}`}>
        <Music className={iconClassName} />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={`object-cover rounded ${className}`}
      loading="lazy"
      onError={handleError}
    />
  );
}
