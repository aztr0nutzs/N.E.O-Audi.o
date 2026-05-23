import React from 'react';
import { cn } from '../../lib/utils';
import { motion } from 'motion/react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg' | 'icon';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    
    return (
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-cyan disabled:pointer-events-none disabled:opacity-50",
          {
            'bg-neo-cyan text-black hover:bg-neo-cyan/90 neo-glow-cyan': variant === 'primary',
            'bg-neo-surface text-neo-cyan border border-neo-cyan/50 hover:bg-neo-cyan/10': variant === 'secondary',
            'bg-neo-red text-white hover:bg-neo-red/90': variant === 'danger',
            'border border-neo-cyan text-neo-cyan hover:bg-neo-cyan hover:text-black': variant === 'outline',
            'hover:bg-neo-surface text-gray-300': variant === 'ghost',
            'h-9 px-3': size === 'sm',
            'h-10 px-4 py-2': size === 'md',
            'h-12 px-6 text-lg': size === 'lg',
            'h-10 w-10': size === 'icon',
          },
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
