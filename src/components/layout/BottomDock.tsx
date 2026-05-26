import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { cn } from '../../lib/utils';

const PRIMARY_ITEMS = [
  { to: '/', label: 'Home', icon: '⌂', accent: 'text-neo-cyan' },
  { to: '/library', label: 'Library', icon: '▦', accent: 'text-neo-lime' },
  { to: '/player', label: 'Player', icon: '▶', accent: 'text-neo-magenta' },
  { to: '/download', label: 'Download', icon: '↓', accent: 'text-neo-yellow' },
  { to: '/equalizer', label: 'Equalizer', icon: '≋', accent: 'text-neo-blue' },
] as const;

const MORE_ITEMS = [
  { to: '/upload', label: 'Upload' },
  { to: '/settings', label: 'Settings' },
] as const;

export function BottomDock() {
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <nav className="neo-fixed-dock fixed inset-x-0 z-50" aria-label="Primary" data-testid="bottom-nav">
      <div className="mx-auto w-[min(100vw-14px,640px)] px-2 pb-[calc(8px+env(safe-area-inset-bottom))]">
        {moreOpen && (
          <div className="mb-2 grid grid-cols-2 gap-2 rounded-2xl border border-neo-cyan/35 bg-black/85 p-2 shadow-[0_0_22px_rgba(0,240,255,0.25)]">
            {MORE_ITEMS.map(item => (
              <NavLink key={item.to} to={item.to} onClick={() => setMoreOpen(false)} className="min-h-12 rounded-xl border border-gray-700/80 bg-[#10131a]/90 px-3 py-2 text-center text-sm font-semibold uppercase tracking-wider text-gray-100">
                {item.label}
              </NavLink>
            ))}
          </div>
        )}
        <div className="grid grid-cols-6 gap-1 rounded-3xl border border-neo-cyan/35 bg-[linear-gradient(180deg,rgba(25,30,36,0.85),rgba(8,10,14,0.96))] p-1.5 shadow-[0_6px_26px_rgba(0,0,0,0.6),inset_0_0_0_1px_rgba(255,255,255,0.07)] backdrop-blur-md">
          {PRIMARY_ITEMS.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                cn(
                  'min-h-12 rounded-2xl border px-1 py-1.5 text-center transition-all',
                  isActive
                    ? `border-current ${item.accent} bg-black/70 shadow-[0_0_18px_rgba(0,240,255,0.35)]`
                    : 'border-transparent text-gray-300 hover:border-gray-500/80 hover:bg-white/5'
                )
              }
            >
              <div className="text-[22px] leading-none">{item.icon}</div>
              <div className="mt-0.5 text-[10px] font-bold uppercase tracking-wider">{item.label}</div>
            </NavLink>
          ))}
          <button
            type="button"
            data-testid="bottom-nav-more"
            aria-expanded={moreOpen}
            onClick={() => setMoreOpen(v => !v)}
            className="min-h-12 rounded-2xl border border-gray-700/80 bg-[#10131a]/95 px-1 py-1.5 text-gray-100"
          >
            <div className="text-[22px] leading-none">⋯</div>
            <div className="mt-0.5 text-[10px] font-bold uppercase tracking-wider">More</div>
          </button>
        </div>
      </div>
    </nav>
  );
}
