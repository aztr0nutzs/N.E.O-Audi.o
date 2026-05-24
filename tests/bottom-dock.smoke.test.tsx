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
    const dockImg = document.querySelector('img[src*="neo_audio_dock.png"]') as HTMLImageElement | null;
    expect(dockImg).not.toBeNull();
  });

  it('exposes navigation links for primary routes', () => {
    render(<MemoryRouter><BottomDock /></MemoryRouter>);
    expect(screen.getByRole('link', { name: /^home$/i })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: /^player$/i })).toHaveAttribute('href', '/player');
    expect(screen.getByRole('link', { name: /^library$/i })).toHaveAttribute('href', '/library');
    expect(screen.getByRole('link', { name: /^settings$/i })).toHaveAttribute('href', '/settings');
  });

  it('exposes secondary access to downloader, upload, equalizer', () => {
    render(<MemoryRouter><BottomDock /></MemoryRouter>);
    expect(screen.getByRole('link', { name: /downloader/i })).toHaveAttribute('href', '/download');
    expect(screen.getByRole('link', { name: /upload/i })).toHaveAttribute('href', '/upload');
    expect(screen.getByRole('link', { name: /equalizer/i })).toHaveAttribute('href', '/equalizer');
  });
});
