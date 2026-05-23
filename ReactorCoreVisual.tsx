import { motion } from 'motion/react';
import { cn } from '../../lib/utils';
import { usePlayerStore } from '../../store/usePlayerStore';
import { Settings, Power, Bot } from 'lucide-react';

interface Props {
  className?: string;
  intensity?: 'low' | 'high';
}

export function ReactorCoreVisual({ className, intensity = 'high' }: Props) {
  const isPlaying = usePlayerStore((state: any) => state.isPlaying);
  const active = isPlaying || intensity === 'high';

  return (
    <div className={cn("relative flex items-center justify-center aspect-square", className)}>
      {/* Outer Armor Ring */}
      <div className="absolute inset-0 rounded-full border-[6px] sm:border-[8px] border-[#1a1a24] shadow-[0_0_30px_rgba(0,0,0,0.8)_inset]" />
      
      {/* Outer Tick Ring */}
      <motion.div
        animate={{ rotate: active ? 360 : 0 }}
        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
        className="absolute inset-[-4px] rounded-full border-2 border-transparent border-t-neo-cyan/50 border-b-neo-magenta/50"
      />

      {/* Quarter HUD Arcs */}
      <motion.div
        animate={{ rotate: active ? 360 : 0 }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        className="absolute inset-[8%] rounded-full border-4 border-transparent border-t-neo-cyan border-b-neo-cyan opacity-80"
      />
      <motion.div
        animate={{ rotate: active ? -360 : 0 }}
        transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
        className="absolute inset-[11%] rounded-full border-4 border-transparent border-l-neo-magenta border-r-neo-magenta opacity-60"
      />

      {/* Gear/Tick Ring */}
      <div className="absolute inset-[15%] rounded-full border border-gray-700 opacity-50" 
           style={{ background: 'repeating-conic-gradient(from 0deg, rgba(255,255,255,0.1) 0deg 2deg, transparent 2deg 10deg)' }} 
      />

      {/* Inner Mechanical Ring */}
      <motion.div
        animate={{ rotate: active ? 360 : 0 }}
        transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
        className="absolute inset-[22%] rounded-full border-[3px] border-dashed border-neo-lime/40"
      />

      {/* Core Center with Bot Face */}
      <div className="absolute inset-[30%] rounded-full bg-[#0a0a0f] border-2 border-neo-cyan neo-glow-cyan flex items-center justify-center overflow-hidden">
        <motion.div
          animate={{ 
            scale: active ? [0.95, 1.05, 0.95] : 1,
            opacity: active ? [0.7, 1, 0.7] : 0.4
          }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="absolute inset-0 bg-gradient-to-br from-neo-cyan/20 to-neo-magenta/20"
        />
        <div className="relative z-10 w-3/4 h-3/4 text-neo-cyan drop-shadow-[0_0_10px_#00f0ff]">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-full h-full">
              {/* Custom bot head vector */}
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 2C6.48 2 2 6.48 2 12c0 2.37.83 4.54 2.22 6.24L3 21l3.5-1.17c1.62.77 3.48 1.17 5.5 1.17 5.52 0 10-4.48 10-10S17.52 2 12 2z" className="text-neo-cyan fill-neo-bg"/>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 11c0-1.1.9-2 2-2h6c1.1 0 2 .9 2 2v2c0 1.1-.9 2-2 2H9c-1.1 0-2-.9-2-2v-2z" className="fill-neo-surface" />
              <circle cx="10" cy="12" r="1" className="fill-neo-magenta text-neo-magenta animate-pulse" />
              <circle cx="14" cy="12" r="1" className="fill-neo-magenta text-neo-magenta animate-pulse" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 16h6" className="text-neo-cyan"/>
            </svg>
        </div>
      </div>
    </div>
  );
}
