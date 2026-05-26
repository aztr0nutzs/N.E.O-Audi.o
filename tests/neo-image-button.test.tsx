import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { NeoImageButton } from '../src/components/ui/NeoImageButton';

describe('NeoImageButton', () => {
  it('renders a real button with an image and aria-label', () => {
    render(
      <NeoImageButton
        src="/assets/neo_audio/play.png"
        alt="Play"
        label="Play current track"
      />
    );
    const btn = screen.getByRole('button', { name: /play current track/i });
    expect(btn).toBeInTheDocument();
    expect(btn.tagName).toBe('BUTTON');
    expect(btn.getAttribute('aria-label')).toBe('Play current track');
    expect(btn).toHaveClass('min-w-[56px]');
    expect(btn).toHaveClass('min-h-[56px]');
    const img = btn.querySelector('img');
    expect(img).not.toBeNull();
    expect(img).toHaveClass('h-[82%]');
    expect(img).toHaveClass('w-[82%]');
    expect(img!.getAttribute('src')).toBe('/assets/neo_audio/play.png');
  });

  it('fires the click handler', () => {
    const onClick = vi.fn();
    render(
      <NeoImageButton
        src="/x.png"
        alt="X"
        label="Trigger X"
        onClick={onClick}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /trigger x/i }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('applies active state attributes', () => {
    render(
      <NeoImageButton src="/x.png" alt="X" label="Active button" active />
    );
    const btn = screen.getByRole('button', { name: /active button/i });
    expect(btn.getAttribute('aria-pressed')).toBe('true');
    expect(btn.getAttribute('data-active')).toBe('true');
  });

  it('renders disabled state without firing clicks', () => {
    const onClick = vi.fn();
    render(
      <NeoImageButton
        src="/x.png"
        alt="X"
        label="Disabled button"
        disabled
        onClick={onClick}
      />
    );
    const btn = screen.getByRole('button', { name: /disabled button/i });
    expect(btn).toBeDisabled();
    fireEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });
});
