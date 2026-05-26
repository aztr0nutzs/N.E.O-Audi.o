import { NEO_AUDIO_HEADER_3, NEO_AUDIO_HEADER_4 } from '../../lib/neoAudioAssets';
import { cn } from '../../lib/utils';
import type { CSSProperties } from 'react';

export type NeoAudioHeaderVariant = 'header3' | 'header4';

interface NeoAudioHeaderProps {
  className?: string;
  alt?: string;
  variant?: NeoAudioHeaderVariant;
  imageSrc?: string;
}

const HEADER_VARIANTS: Record<NeoAudioHeaderVariant, string> = {
  header3: NEO_AUDIO_HEADER_3,
  header4: NEO_AUDIO_HEADER_4,
};

export function NeoAudioHeader({
  className,
  alt = 'N.E.O Audio Lab',
  variant = 'header3',
  imageSrc,
}: NeoAudioHeaderProps) {
  const src = imageSrc ?? HEADER_VARIANTS[variant];
  const headerStyle = {
    '--neo-audio-header-image': `url("${src}")`,
  } as CSSProperties;

  return (
    <div
      className={cn(
        'neo-audio-header neo-header-plate relative flex w-full items-center justify-center overflow-hidden rounded-xl border border-neo-cyan/30 bg-black/35 shadow-[0_0_20px_rgba(0,240,255,0.15)]',
        className
      )}
      data-testid="neo-audio-header"
      data-variant={imageSrc ? 'custom' : variant}
      role="img"
      aria-label={alt}
      style={headerStyle}
    >
      <img
        src={src}
        alt=""
        aria-hidden="true"
        draggable={false}
        className="neo-audio-header-image pointer-events-none absolute inset-0 h-full w-full select-none opacity-0"
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, rgba(0,0,0,0) 60%, rgba(3,3,5,0.55) 100%)',
        }}
      />
    </div>
  );
}
