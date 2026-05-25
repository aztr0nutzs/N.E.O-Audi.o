import { NavLink } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { NEO_AUDIO_DOCK } from '../../lib/neoAudioAssets';

type Accent = 'cyan' | 'magenta' | 'lime' | 'yellow' | 'gray';

interface DockSlot {
  to?: string;
  label: string;
  area: 'home' | 'chat' | 'center' | 'games' | 'settings';
  accent: Accent;
  end?: boolean;
  disabled?: boolean;
  disabledReason?: string;
}

const DOCK_SLOTS: DockSlot[] = [
  { to: '/', label: 'Home', area: 'home', accent: 'cyan', end: true },
  { label: 'Chat', area: 'chat', accent: 'gray', disabled: true, disabledReason: 'Chat coming soon' },
  { to: '/player', label: 'Player', area: 'center', accent: 'magenta' },
  { to: '/library', label: 'Library', area: 'games', accent: 'lime' },
  { to: '/settings', label: 'Settings', area: 'settings', accent: 'yellow' },
];

const SECONDARY_LINKS: { to: string; label: string; accent: Accent }[] = [
  { to: '/download', label: 'Downloader', accent: 'cyan' },
  { to: '/upload', label: 'Upload', accent: 'lime' },
  { to: '/equalizer', label: 'Equalizer', accent: 'magenta' },
];

const accentRing: Record<Accent, string> = {
  cyan: 'border-neo-cyan shadow-[0_0_15px_rgba(0,240,255,0.55)]',
  magenta: 'border-neo-magenta shadow-[0_0_18px_rgba(255,0,255,0.55)]',
  lime: 'border-neo-lime shadow-[0_0_15px_rgba(57,255,20,0.55)]',
  yellow: 'border-neo-yellow shadow-[0_0_15px_rgba(252,226,5,0.55)]',
  gray: 'border-gray-600',
};

const accentHoverRing: Record<Accent, string> = {
  cyan: 'hover:border-neo-cyan/70',
  magenta: 'hover:border-neo-magenta/70',
  lime: 'hover:border-neo-lime/70',
  yellow: 'hover:border-neo-yellow/70',
  gray: 'hover:border-gray-500/70',
};

const accentText: Record<Accent, string> = {
  cyan: 'text-neo-cyan',
  magenta: 'text-neo-magenta',
  lime: 'text-neo-lime',
  yellow: 'text-neo-yellow',
  gray: 'text-gray-500',
};

export function BottomDock() {
  return (
    <div className="fixed bottom-0 left-0 z-50 w-full md:pb-6 pb-2 flex justify-center pointer-events-none">
      <div className="relative mx-2 w-full max-w-2xl pointer-events-none">
        {/* Dock art rail */}
        <div className="relative pointer-events-none" style={{ aspectRatio: '5 / 1' }}>
          <img
            src={NEO_AUDIO_DOCK}
            alt="N.E.O Audio dock"
            aria-hidden="true"
            draggable={false}
            className="absolute inset-0 h-full w-full object-contain object-bottom select-none pointer-events-none drop-shadow-[0_10px_30px_rgba(0,0,0,0.8)]"
          />

          {/* Overlay clickable controls aligned to dock slots */}
          <div className="absolute inset-0 grid grid-cols-5 items-center px-[6%] pointer-events-none">
            {DOCK_SLOTS.map(slot => {
              const isCenter = slot.area === 'center';
              const baseShape = isCenter
                ? 'h-[120%] aspect-square -translate-y-2'
                : 'h-[78%] aspect-square';
              const commonClass =
                'pointer-events-auto relative flex items-center justify-center select-none transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-cyan rounded-full border-2';

              if (slot.disabled || !slot.to) {
                return (
                  <button
                    key={slot.area}
                    type="button"
                    disabled
                    aria-label={slot.label}
                    aria-disabled="true"
                    title={slot.disabledReason ?? `${slot.label} unavailable`}
                    className={cn(
                      commonClass,
                      baseShape,
                      'border-transparent opacity-50 cursor-not-allowed'
                    )}
                  >
                    <span className="sr-only">{slot.label}</span>
                  </button>
                );
              }

              return (
                <NavLink
                  key={slot.area}
                  to={slot.to}
                  end={slot.end}
                  aria-label={slot.label}
                  className={({ isActive }) =>
                    cn(
                      commonClass,
                      baseShape,
                      isActive
                        ? accentRing[slot.accent]
                        : cn('border-transparent', accentHoverRing[slot.accent])
                    )
                  }
                >
                  {({ isActive }) => (
                    <span className={cn('sr-only', isActive && accentText[slot.accent])}>
                      {slot.label}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </div>
        </div>

        {/* Compact secondary strip — keeps Downloader, Upload, and Equalizer reachable */}
        <div className="pointer-events-auto mt-1 flex justify-center gap-2 px-2">
          {SECONDARY_LINKS.map(link => (
            <NavLink
              key={link.to}
              to={link.to}
              aria-label={link.label}
              className={({ isActive }) =>
                cn(
                  'cyber-panel px-3 py-1 text-[10px] font-mono uppercase tracking-widest rounded-md border bg-black/60 transition-all',
                  isActive
                    ? cn('border-current', accentText[link.accent])
                    : 'border-gray-800 text-gray-400 hover:text-white hover:border-gray-600'
                )
              }
            >
              {link.label}
            </NavLink>
          ))}
        </div>
      </div>
    </div>
  );
}
