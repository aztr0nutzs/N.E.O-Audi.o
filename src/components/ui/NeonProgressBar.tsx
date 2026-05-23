import { cn } from '../../lib/utils';
import { motion } from 'motion/react';

interface NeonProgressBarProps {
  progress: number; // 0 to 100
  color?: 'cyan' | 'lime' | 'magenta' | 'yellow';
  className?: string;
}

export function NeonProgressBar({ progress, color = 'cyan', className }: NeonProgressBarProps) {
  const colorMap = {
    cyan: 'bg-neo-cyan shadow-[0_0_10px_rgba(0,240,255,0.8)]',
    lime: 'bg-neo-lime shadow-[0_0_10px_rgba(57,255,20,0.8)]',
    magenta: 'bg-neo-magenta shadow-[0_0_10px_rgba(255,0,255,0.8)]',
    yellow: 'bg-neo-yellow shadow-[0_0_10px_rgba(252,226,5,0.8)]',
  };

  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-gray-900", className)}>
      <motion.div
        className={cn("h-full transition-all duration-300 ease-out rounded-full", colorMap[color])}
        initial={{ width: 0 }}
        animate={{ width: `${progress}%` }}
      />
    </div>
  );
}
