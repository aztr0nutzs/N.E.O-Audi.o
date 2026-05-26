import React from 'react';
import { cn } from '../../lib/utils';

export type NeoImageButtonSize = 'sm' | 'md' | 'lg' | 'xl';

export interface NeoImageButtonProps {
  src: string;
  alt: string;
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
  imageClassName?: string;
  size?: NeoImageButtonSize;
  type?: 'button' | 'submit' | 'reset';
  title?: string;
}

const SIZE_CLASSES: Record<NeoImageButtonSize, string> = {
  sm: 'w-11 h-11 min-w-[44px] min-h-[44px] p-1',
  md: 'w-14 h-14 min-w-[56px] min-h-[56px] p-1.5',
  lg: 'w-[72px] h-[72px] min-w-[72px] min-h-[72px] p-2',
  xl: 'w-[92px] h-[92px] min-w-[92px] min-h-[92px] p-2.5',
};

export const NeoImageButton = React.forwardRef<HTMLButtonElement, NeoImageButtonProps>(
  function NeoImageButton(
    {
      src,
      alt,
      label,
      active = false,
      disabled = false,
      onClick,
      className,
      imageClassName,
      size = 'md',
      type = 'button',
      title,
    },
    ref
  ) {
    return (
      <button
        ref={ref}
        type={type}
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
        aria-pressed={active || undefined}
        aria-disabled={disabled || undefined}
        title={title ?? label}
        data-active={active ? 'true' : undefined}
        className={cn(
          'neo-image-button relative inline-flex items-center justify-center rounded-xl border bg-black/40 transition-all select-none',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-black',
          'active:scale-95 touch-manipulation',
          SIZE_CLASSES[size],
          active
            ? 'border-neo-cyan shadow-[0_0_18px_rgba(0,240,255,0.65)] ring-1 ring-neo-cyan/70'
            : 'border-gray-800 hover:border-neo-cyan/60 hover:shadow-[0_0_10px_rgba(0,240,255,0.35)]',
          disabled && 'opacity-40 grayscale cursor-not-allowed pointer-events-none',
          className
        )}
      >
        <img
          src={src}
          alt={alt}
          draggable={false}
          aria-hidden="true"
          className={cn(
            'pointer-events-none h-[82%] w-[82%] object-contain select-none',
            active && 'drop-shadow-[0_0_6px_rgba(0,240,255,0.85)]',
            imageClassName
          )}
        />
      </button>
    );
  }
);
