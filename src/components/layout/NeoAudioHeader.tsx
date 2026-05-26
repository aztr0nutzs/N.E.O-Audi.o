import { NEO_AUDIO_HEADER_3, NEO_AUDIO_HEADER_4 } from '../../lib/neoAudioAssets';
import { cn } from '../../lib/utils';

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

const VARIANT_FRAME_CLASS: Record<NeoAudioHeaderVariant, string> = {
  header3: 'neo-audio-header-image--header3',
  header4: 'neo-audio-header-image--header4',
};

export function NeoAudioHeader({ className, alt = 'N.E.O Audio Lab', variant = 'header3', imageSrc }: NeoAudioHeaderProps) {
  const src = imageSrc ?? HEADER_VARIANTS[variant];

  return (
    <div
      className={cn('neo-audio-header neo-header-plate relative w-full overflow-hidden rounded-xl border border-neo-cyan/30 bg-black/35 shadow-[0_0_20px_rgba(0,240,255,0.15)]', className)}
      data-testid="neo-audio-header"
      data-variant={imageSrc ? 'custom' : variant}
      role="img"
      aria-label={alt}
    >
      <img src={src} alt="" aria-hidden="true" draggable={false} className={cn('neo-audio-header-image h-full w-full object-contain', !imageSrc && VARIANT_FRAME_CLASS[variant])} />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#030305]/55" />
    </div>
  );
}
