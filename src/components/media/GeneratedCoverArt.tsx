import { cn } from '../../lib/utils';

interface GeneratedCoverArtProps {
  title: string;
  artist?: string;
  genre?: string;
  mood?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  active?: boolean;
  className?: string;
}

const sizeClasses: Record<NonNullable<GeneratedCoverArtProps['size']>, string> = {
  sm: 'h-10 w-10',
  md: 'h-14 w-14',
  lg: 'h-32 w-32',
  xl: 'h-full w-full',
};

const moodThemes: Record<string, [string, string, string]> = {
  'night drive': ['#00f0ff', '#0080ff', '#ff8a00'],
  'bass heavy': ['#39ff14', '#ff00ff', '#050508'],
  chill: ['#00f0ff', '#8b5cf6', '#050508'],
  focus: ['#0080ff', '#00f0ff', '#050508'],
  retro: ['#ff00ff', '#ff8a00', '#050508'],
  hype: ['#39ff14', '#ff8a00', '#050508'],
};

function stableHash(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function pickTheme(title: string, artist?: string, genre?: string, mood?: string): [string, string, string] {
  const key = (mood || genre || '').toLowerCase();
  if (moodThemes[key]) return moodThemes[key];
  const themes: Array<[string, string, string]> = [
    ['#00f0ff', '#ff00ff', '#050508'],
    ['#39ff14', '#00f0ff', '#050508'],
    ['#ff00ff', '#fce205', '#050508'],
    ['#0080ff', '#39ff14', '#050508'],
    ['#fce205', '#ff00ff', '#050508'],
  ];
  return themes[stableHash(`${title}-${artist || ''}`) % themes.length];
}

function initials(title: string, artist?: string): string {
  const words = (title || artist || 'N E O').split(/\s+/).filter(Boolean);
  const glyph = words.slice(0, 3).map(word => word[0]).join('').toUpperCase();
  return glyph || 'NEO';
}

export function GeneratedCoverArt({
  title,
  artist,
  genre,
  mood,
  size = 'md',
  active,
  className,
}: GeneratedCoverArtProps) {
  const seed = `${title || 'Unknown Signal'}-${artist || 'Unknown Artist'}`;
  const [primary, secondary, base] = pickTheme(title, artist, genre, mood);
  const hash = stableHash(seed);
  const bars = Array.from({ length: 12 }).map((_, index) => {
    const value = (Math.sin(hash + index * 1.91) + 1) / 2;
    return Math.round(22 + value * 68);
  });
  const ringOffset = hash % 360;

  return (
    <div
      data-testid="generated-cover-art"
      aria-label={`${title || 'Unknown track'} generated cover art`}
      className={cn(
        'relative aspect-square shrink-0 overflow-hidden rounded border bg-black',
        sizeClasses[size],
        active ? 'border-neo-lime shadow-[0_0_18px_rgba(57,255,20,0.45)]' : 'border-neo-cyan/40 shadow-[0_0_14px_rgba(0,240,255,0.18)]',
        className,
      )}
      style={{
        background: `radial-gradient(circle at 50% 42%, ${primary}33 0%, transparent 34%), linear-gradient(135deg, ${base} 0%, #080910 45%, ${secondary}26 100%)`,
      }}
    >
      <div
        className="absolute inset-[15%] rounded-full border-2 opacity-80"
        style={{
          borderColor: primary,
          boxShadow: `0 0 18px ${primary}66, inset 0 0 16px ${secondary}44`,
          transform: `rotate(${ringOffset}deg)`,
        }}
      />
      <div className="absolute inset-[27%] rounded-full border border-white/10 bg-black/50" />
      <div className="absolute inset-x-[14%] bottom-[15%] flex h-[18%] items-end gap-[3%]">
        {bars.map((height, index) => (
          <span
            key={index}
            className="flex-1 rounded-t"
            style={{ height: `${height}%`, background: index % 2 ? secondary : primary, boxShadow: `0 0 5px ${index % 2 ? secondary : primary}` }}
          />
        ))}
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="max-w-[78%] truncate text-center font-black italic tracking-widest text-white drop-shadow-[0_0_8px_currentColor]">
          {initials(title, artist)}
        </span>
      </div>
    </div>
  );
}

