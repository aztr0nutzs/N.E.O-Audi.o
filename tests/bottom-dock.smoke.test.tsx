import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { BottomDock } from '../src/components/layout/BottomDock';

describe('BottomDock', () => {
  it('renders without crashing under MemoryRouter', () => {
    render(<MemoryRouter><BottomDock /></MemoryRouter>);
  });

  it('renders the dock image', () => {
    render(<MemoryRouter><BottomDock /></MemoryRouter>);
    const dockImg = screen.getByTestId('bottom-dock-image') as HTMLImageElement;
    expect(dockImg).toHaveClass('object-contain');
    expect(dockImg).toHaveClass('h-full');
    expect(dockImg.getAttribute('src')).toContain('neo_audio_dock.png');
  });

  it('uses a fixed dock wrapper', () => {
    render(<MemoryRouter><BottomDock /></MemoryRouter>);
    expect(screen.getByTestId('bottom-dock')).toHaveClass('fixed');
    expect(screen.getByTestId('bottom-dock')).toHaveClass('neo-fixed-dock');
  });

  it('exposes navigation links for primary routes', () => {
    render(<MemoryRouter><BottomDock /></MemoryRouter>);
    expect(screen.getByRole('link', { name: /^home$/i })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: /^player$/i })).toHaveAttribute('href', '/player');
    expect(screen.getByRole('link', { name: /^library$/i })).toHaveAttribute('href', '/library');
    expect(screen.getByRole('link', { name: /^settings$/i })).toHaveAttribute('href', '/settings');
  });

  it('exposes disabled chat control', () => {
    render(<MemoryRouter><BottomDock /></MemoryRouter>);
    const chat = screen.getByRole('button', { name: /^chat$/i });
    expect(chat).toBeDisabled();
    expect(chat).toHaveAttribute('aria-disabled', 'true');
  });

  it('exposes secondary access to downloader, upload, equalizer', () => {
    render(<MemoryRouter><BottomDock /></MemoryRouter>);
    expect(screen.getByTestId('secondary-nav')).toBeInTheDocument();
    expect(screen.getByTestId('secondary-nav')).toHaveClass('min-h-11');
    expect(screen.getByRole('link', { name: /downloader/i })).toHaveAttribute('href', '/download');
    expect(screen.getByRole('link', { name: /upload/i })).toHaveAttribute('href', '/upload');
    expect(screen.getByRole('link', { name: /equalizer/i })).toHaveAttribute('href', '/equalizer');
  });
});
