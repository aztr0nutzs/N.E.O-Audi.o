import { useState } from 'react';
import { Track } from '../../types';
import { cn } from '../../lib/utils';
import { GeneratedCoverArt } from './GeneratedCoverArt';

interface CoverArtProps {
  track: Track;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  active?: boolean;
  className?: string;
  imageClassName?: string;
}

const sizeClasses: Record<NonNullable<CoverArtProps['size']>, string> = {
  sm: 'h-10 w-10',
  md: 'h-14 w-14',
  lg: 'h-32 w-32',
  xl: 'h-full w-full',
};

export function CoverArt({ track, size = 'md', active, className, imageClassName }: CoverArtProps) {
  const [failed, setFailed] = useState(false);
  const imageUrl = track.coverArtUrl || track.coverArt;

  if (!imageUrl || failed) {
    return (
      <GeneratedCoverArt
        title={track.title}
        artist={track.artist}
        genre={track.genre}
        mood={track.mood}
        size={size}
        active={active}
        className={className}
      />
    );
  }

  return (
    <div
      data-testid="cover-art"
      className={cn(
        'relative aspect-square shrink-0 overflow-hidden rounded border bg-black',
        sizeClasses[size],
        active ? 'border-neo-lime shadow-[0_0_18px_rgba(57,255,20,0.45)]' : 'border-neo-cyan/40 shadow-[0_0_14px_rgba(0,240,255,0.18)]',
        className,
      )}
    >
      <img
        src={imageUrl}
        alt={`${track.title} cover art`}
        className={cn('h-full w-full object-cover', imageClassName)}
        onError={() => setFailed(true)}
      />
    </div>
  );
}

