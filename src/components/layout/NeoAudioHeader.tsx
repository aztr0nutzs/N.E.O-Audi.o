import { useEffect, useRef, useState } from 'react';
import { NEO_AUDIO_HEADERS } from '../../lib/neoAudioAssets';
import { cn } from '../../lib/utils';

interface NeoAudioHeaderProps {
  className?: string;
  alt?: string;
}

const ROTATE_MIN_MS = 20_000;
const ROTATE_MAX_MS = 45_000;
const CROSSFADE_MS = 900;

const randomDelay = () =>
  ROTATE_MIN_MS + Math.floor(Math.random() * (ROTATE_MAX_MS - ROTATE_MIN_MS));

export function NeoAudioHeader({ className, alt = 'N.E.O Audio Lab' }: NeoAudioHeaderProps) {
  const [activeIndex, setActiveIndex] = useState<number>(() =>
    Math.floor(Math.random() * NEO_AUDIO_HEADERS.length)
  );
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prefersReducedMotion = useRef<boolean>(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      prefersReducedMotion.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    if (NEO_AUDIO_HEADERS.length <= 1) return;

    const schedule = () => {
      timeoutRef.current = setTimeout(() => {
        setActiveIndex(prev => (prev + 1) % NEO_AUDIO_HEADERS.length);
        schedule();
      }, randomDelay());
    };

    schedule();

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, []);

  const transitionDuration = prefersReducedMotion.current ? 0 : CROSSFADE_MS;

  return (
    <div
      className={cn(
        'neo-audio-header neo-header-plate relative w-full overflow-hidden rounded-xl border border-neo-cyan/30 bg-black/40 shadow-[0_0_20px_rgba(0,240,255,0.15)]',
        className
      )}
      role="img"
      aria-label={alt}
    >
      {NEO_AUDIO_HEADERS.map((src, i) => (
        <img
          key={src}
          src={src}
          alt=""
          aria-hidden={i !== activeIndex}
          draggable={false}
          className="absolute inset-0 h-full w-full object-contain object-center select-none pointer-events-none"
          style={{
            opacity: i === activeIndex ? 1 : 0,
            transition: `opacity ${transitionDuration}ms ease-in-out`,
          }}
        />
      ))}
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
