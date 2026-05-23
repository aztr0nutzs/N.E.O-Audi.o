import { Home, Download, Upload, ListMusic, PlayCircle, Settings } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { useAppStore } from '../../store/useAppStore';

const navItems = [
  { path: '/', icon: Home, label: 'Dashboard' },
  { path: '/download', icon: Download, label: 'Download' },
  { path: '/upload', icon: Upload, label: 'Upload' },
  { path: '/library', icon: ListMusic, label: 'Library' },
  { path: '/player', icon: PlayCircle, label: 'Player' },
  { path: '/settings', icon: Settings, label: 'Settings' },
];

export function SidebarNav() {
  const isSidebarOpen = useAppStore(state => state.isSidebarOpen);

  return (
    <aside className={cn(
      "fixed left-0 top-0 z-40 h-screen w-64 -translate-x-full border-r border-gray-800 bg-neo-surface/90 glass-panel pt-20 transition-transform md:translate-x-0 cursor-default",
      isSidebarOpen && "translate-x-0"
    )}>
      <div className="flex h-full flex-col overflow-y-auto px-3 py-4">
        <div className="mb-8 px-4">
          <h1 className="text-2xl font-bold italic text-white tracking-widest neo-glow-cyan drop-shadow-md">N.E.O.</h1>
          <p className="text-xs text-neo-cyan">Downloader</p>
        </div>
        <ul className="space-y-2 font-medium">
          {navItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                className={({ isActive }) => cn(
                  "flex items-center rounded-lg p-2 transition-all",
                  isActive 
                    ? "bg-neo-cyan/20 text-neo-cyan neo-glow-cyan" 
                    : "text-gray-400 hover:bg-gray-800 hover:text-white"
                )}
              >
                <item.icon className="h-5 w-5" />
                <span className="ml-3">{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
