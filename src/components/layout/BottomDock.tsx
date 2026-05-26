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
    <nav
      className="neo-fixed-dock fixed left-0 right-0 z-50 flex justify-center pointer-events-none"
      aria-label="Primary"
      data-testid="bottom-dock"
    >
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black via-black/90 to-transparent pointer-events-none" />
      <div className="relative mx-2 flex w-[min(calc(100vw-16px),720px)] flex-col items-center pointer-events-none">
        {/* Dock art rail */}
        <div className="neo-dock-viewport relative w-full pointer-events-none">
          <img
            src={NEO_AUDIO_DOCK}
            alt="N.E.O Audio dock"
            draggable={false}
            data-testid="bottom-dock-image"
            className="neo-dock-art absolute select-none pointer-events-none drop-shadow-[0_10px_30px_rgba(0,0,0,0.8)]"
          />

          {/* Overlay clickable controls aligned to dock slots */}
          <div className="absolute inset-x-0 bottom-[10%] top-[12%] grid grid-cols-5 items-center px-[3.5%] pointer-events-none">
            {DOCK_SLOTS.map(slot => {
              const isCenter = slot.area === 'center';
              const baseShape = isCenter
                ? 'min-h-16 h-[86%] aspect-square -translate-y-1'
                : 'min-h-12 h-[66%] aspect-square';
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
      </div>
    </nav>
  );
}
