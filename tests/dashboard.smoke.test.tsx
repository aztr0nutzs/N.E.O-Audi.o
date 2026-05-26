import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../src/store/useLibraryStore', () => ({
  useLibraryStore: (sel?: any) => {
    const state = {
    tracks: [
      { id: 'a', title: 'Alpha', artist: 'Artist A', sourceType: 'local', localUrl: '', format: 'mp3', duration: 120, size: 1, createdAt: 1, updatedAt: 1, favorite: false },
      { id: 'b', title: 'Beta', artist: 'Artist B', sourceType: 'local', localUrl: '', format: 'mp3', duration: 90, size: 1, createdAt: 2, updatedAt: 2, favorite: false },
    ],
    playlists: [],
    loadLibrary: vi.fn(),
  };
    return typeof sel === 'function' ? sel(state) : state;
  },
}));
vi.mock('../src/store/useDownloadStore', () => ({ useDownloadStore: (sel?: any) => {
  const state = { jobs: [], loadJobs: vi.fn() };
  return typeof sel === 'function' ? sel(state) : state;
} }));
vi.mock('../src/store/usePlayerStore', () => ({
  usePlayerStore: (sel?: any) => {
    const state = {
      currentTrackId: 'a',
      queue: ['a', 'b'],
      queueIndex: 0,
      isPlaying: false,
      progress: 0,
      duration: 0,
      repeat: 'off',
      shuffle: false,
      volume: 1,
      playbackSpeed: 1,
      analyserNode: null,
      pause: vi.fn(),
      resume: vi.fn(),
      stop: vi.fn(),
      playTrack: vi.fn(),
      addManyToQueue: vi.fn(),
    };
    return typeof sel === 'function' ? sel(state) : state;
  },
}));
vi.mock('../src/store/useEqualizerStore', () => ({ useEqualizerStore: () => ({ isOn: true, activePreset: 'Flat', bandValues: [0, 0, 0], spatial: 0 }) }));
vi.mock('../src/store/useSignalChainStore', () => ({
  useSignalChainStore: (sel?: any) => {
    const state = {
      modules: {
        eq: { enabled: true },
        bass: { enabled: false },
        spatial: { enabled: false },
        limiter: { enabled: true },
      },
      clippingWarning: false,
    };
    return typeof sel === 'function' ? sel(state) : state;
  },
}));
vi.mock('../src/store/useAnalyzerStore', () => ({ useAnalyzerStore: (sel?: any) => {
  const state = { setAnalyzerOpen: vi.fn() };
  return typeof sel === 'function' ? sel(state) : state;
} }));
vi.mock('../src/components/ui/ReactorCoreVisual', () => ({ ReactorCoreVisual: () => <div data-testid="reactor" /> }));
vi.mock('../src/lib/utils', () => ({ cn: (...a: string[]) => a.filter(Boolean).join(' '), formatDuration: () => '00:00' }));
vi.mock('motion/react', () => ({ motion: { div: (props: any) => <div {...props} /> } }));

describe('Dashboard smoke', () => {
  it('renders command center dashboard sections', async () => {
    const { Dashboard } = await import('../src/pages/Dashboard');
    render(<MemoryRouter><Dashboard /></MemoryRouter>);
    expect(screen.getByText(/n\.e\.o audio command center/i)).toBeInTheDocument();
    expect(screen.getByText(/center reactor status/i)).toBeInTheDocument();
    expect(screen.getByText(/now playing/i)).toBeInTheDocument();
    expect(screen.getByText(/up next/i)).toBeInTheDocument();
    expect(screen.getAllByText('Beta').length).toBeGreaterThan(0);
  });
});
