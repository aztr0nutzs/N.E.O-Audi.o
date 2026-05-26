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
  imageScale?: number;
  imageOffsetX?: string;
  imageOffsetY?: string;
  imageFocusX?: number;
  imageFocusY?: number;
}

const SIZE_CLASSES: Record<NeoImageButtonSize, string> = {
  sm: 'w-11 h-11 min-w-[44px] min-h-[44px] p-1',
  md: 'w-[60px] h-[60px] min-w-[60px] min-h-[60px] p-1',
  lg: 'w-[76px] h-[76px] min-w-[76px] min-h-[76px] p-1.5',
  xl: 'w-24 h-24 min-w-[96px] min-h-[96px] p-2',
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
      imageScale = 1.2,
      imageOffsetX = '0',
      imageOffsetY = '0',
      imageFocusX,
      imageFocusY,
    },
    ref
  ) {
    const hasImageFocus = typeof imageFocusX === 'number' && typeof imageFocusY === 'number';
    const focusedImageSize = `${Number((88 * imageScale).toFixed(2))}%`;
    const imageStyle = hasImageFocus
      ? {
          width: focusedImageSize,
          height: focusedImageSize,
          left: `calc(50% - ${(88 * imageScale * imageFocusX) / 100}%)`,
          top: `calc(50% - ${(88 * imageScale * imageFocusY) / 100}%)`,
        }
      : { transform: `translate(${imageOffsetX}, ${imageOffsetY}) scale(${imageScale})` };

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
          'neo-image-button relative inline-flex items-center justify-center overflow-hidden rounded-xl border bg-black/40 transition-all select-none',
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
          style={imageStyle}
          className={cn(
            'pointer-events-none object-contain select-none',
            hasImageFocus ? 'absolute max-w-none' : 'h-[88%] w-[88%]',
            active && 'drop-shadow-[0_0_6px_rgba(0,240,255,0.85)]',
            imageClassName
          )}
        />
      </button>
    );
  }
);
