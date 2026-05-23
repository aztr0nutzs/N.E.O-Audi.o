import { Download, Upload, ListMusic, Music, Shield, Cpu, Zap, Radio } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { cn } from '../../lib/utils';

export function BottomDock() {
  return (
    <div className="fixed bottom-0 left-0 z-50 w-full md:pb-6 pb-2 flex justify-center pointer-events-none">
      <div className="cyber-panel px-4 py-3 flex items-center justify-center gap-2 pointer-events-auto rounded-xl sm:rounded-2xl mx-2 shadow-[0_10px_30px_#000]">
        
        {/* Left Rect Buttons */}
        <NavLink to="/download" className={({ isActive }) => cn(
          "w-12 h-10 sm:w-16 sm:h-12 border-2 rounded-lg flex flex-col items-center justify-center transition-all bg-[#0a0a0f] gap-0.5",
          isActive ? "border-neo-cyan text-neo-cyan shadow-[0_0_15px_rgba(0,240,255,0.4)_inset]" : "border-gray-700 text-gray-500 hover:border-neo-cyan/50 hover:text-neo-cyan/80"
        )}>
          <Download className="w-5 h-5" />
        </NavLink>
        
        <NavLink to="/upload" className={({ isActive }) => cn(
          "w-12 h-10 sm:w-16 sm:h-12 border-2 rounded-lg flex flex-col items-center justify-center transition-all bg-[#0a0a0f] gap-0.5",
          isActive ? "border-neo-lime text-neo-lime shadow-[0_0_15px_rgba(57,255,20,0.4)_inset]" : "border-gray-700 text-gray-500 hover:border-neo-lime/50 hover:text-neo-lime/80"
        )}>
          <Zap className="w-5 h-5" />
        </NavLink>

        {/* Center Radar/Player Button */}
        <NavLink to="/player" className={({ isActive }) => cn(
          "relative flex items-center justify-center mx-2 sm:mx-4 w-16 h-16 sm:w-20 sm:h-20 rounded-full border-4 shadow-xl z-10 transition-transform bg-[#0a0a0e]",
          isActive ? "border-neo-magenta neo-glow-magenta scale-105" : "border-[#2a2a35] hover:border-neo-magenta/50 hover:scale-105"
        )}>
          {({ isActive }) => (
            <>
               <div className="absolute inset-1 rounded-full border border-dashed border-gray-600 animate-[spin_15s_linear_infinite]" />
               <div className={cn("absolute inset-2 rounded-full", isActive ? "bg-gradient-to-br from-neo-magenta/20 to-neo-cyan/20" : "")} />
               <Radio className={cn("w-6 h-6 sm:w-8 sm:h-8 z-10", isActive ? "text-neo-magenta" : "text-gray-400")} />
            </>
          )}
        </NavLink>

        {/* Right Rect Buttons */}
        <NavLink to="/library" className={({ isActive }) => cn(
          "w-12 h-10 sm:w-16 sm:h-12 border-2 rounded-lg flex flex-col items-center justify-center transition-all bg-[#0a0a0f] gap-0.5",
          isActive ? "border-neo-yellow text-neo-yellow shadow-[0_0_15px_rgba(252,226,5,0.4)_inset]" : "border-gray-700 text-gray-500 hover:border-neo-yellow/50 hover:text-neo-yellow/80"
        )}>
          <ListMusic className="w-5 h-5" />
        </NavLink>

        <NavLink to="/equalizer" className={({ isActive }) => cn(
          "w-12 h-10 sm:w-16 sm:h-12 border-2 rounded-lg flex flex-col items-center justify-center transition-all bg-[#0a0a0f] gap-0.5",
          isActive ? "border-neo-cyan text-neo-cyan shadow-[0_0_15px_rgba(0,240,255,0.4)_inset]" : "border-gray-700 text-gray-500 hover:border-neo-cyan/50 hover:text-neo-cyan/80"
        )}>
          <Cpu className="w-5 h-5" />
        </NavLink>

      </div>
    </div>
  );
}
