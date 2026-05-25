import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';

const baseStore = {
  currentTrackId: null as string | null,
  queue: [] as string[],
  queueIndex: 0,
  history: [] as string[],
  isPlaying: false,
  pause: vi.fn(),
  resume: vi.fn(),
  stop: vi.fn(),
  next: vi.fn(),
  previous: vi.fn(),
  seekForward: vi.fn(),
  seekBackward: vi.fn(),
  progress: 0,
  volume: 1,
  setVolume: vi.fn(),
  repeat: 'off' as 'off' | 'all' | 'one',
  toggleRepeat: vi.fn(),
  shuffle: false,
  toggleShuffle: vi.fn(),
  seekTo: vi.fn(),
  analyserNode: null,
  error: null,
  duration: 0,
  playbackSpeed: 1,
  setSpeed: vi.fn(),
  playQueueFromIndex: vi.fn(),
  removeFromQueue: vi.fn(),
  moveQueueItem: vi.fn(),
  clearQueue: vi.fn(),
  clearHistory: vi.fn(),
  shuffleQueue: vi.fn(),
  saveQueueSnapshot: vi.fn(() => ({ currentTrackId: null, queue: [], history: [] })),
  addManyToQueue: vi.fn(),
};

const storeRef = { current: { ...baseStore } };

vi.mock('../src/store/usePlayerStore', () => ({
  usePlayerStore: () => storeRef.current,
}));

const tracksRef = { current: [] as any[] };
vi.mock('../src/store/useLibraryStore', () => ({
  useLibraryStore: (sel: any) => sel({ tracks: tracksRef.current, addPlaylist: vi.fn() }),
}));

vi.mock('../src/components/ui/ReactorCoreVisual', () => ({
  ReactorCoreVisual: () => <div data-testid="reactor" />,
}));

vi.mock('../src/lib/utils', () => ({
  cn: (...a: any[]) => a.filter(Boolean).join(' '),
  formatDuration: () => '00:00',
}));

vi.mock('../src/store/useAnalyzerStore', () => ({ useAnalyzerStore: (sel: any) => sel({ setAnalyzerOpen: vi.fn() }) }));

vi.mock('motion/react', () => ({
  motion: { div: (props: any) => <div {...props} /> },
}));

describe('Player smoke', () => {
  it('renders idle state safely', async () => {
    storeRef.current = { ...baseStore };
    tracksRef.current = [];
    const { Player } = await import('../src/pages/Player');
    render(<MemoryRouter><Player /></MemoryRouter>);
    expect(screen.getByText(/awaiting signal/i)).toBeInTheDocument();
  });

  it('renders image-backed transport controls with a track', async () => {
    storeRef.current = {
      ...baseStore,
      currentTrackId: 't1',
      queue: ['t1', 't2'],
      duration: 100,
      progress: 0.25,
    };
    tracksRef.current = [
      {
        id: 't1',
        title: 'Test Track',
        artist: 'Test Artist',
        sourceType: 'local',
        localUrl: 'blob:test',
        format: 'mp3',
        bitrate: 320,
        duration: 100,
        size: 1000,
        createdAt: 0,
        updatedAt: 0,
        favorite: false,
      },
      {
        id: 't2',
        title: 'Next Track',
        artist: 'Test Artist',
        sourceType: 'local',
        localUrl: 'blob:test-2',
        format: 'mp3',
        bitrate: 320,
        duration: 100,
        size: 1000,
        createdAt: 0,
        updatedAt: 0,
        favorite: false,
      },
    ];

    const { Player } = await import('../src/pages/Player');
    render(<MemoryRouter><Player /></MemoryRouter>);

    expect(screen.getByRole('button', { name: /^play$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /rewind 15 seconds/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /fast-forward 15 seconds/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^stop$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /next track/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /previous track/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /open equalizer/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /open downloader/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /open settings/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /open track lab/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /open live analyzer/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /open metadata lab/i })).toBeInTheDocument();
  });

  it('opens queue panel from the player', async () => {
    storeRef.current = {
      ...baseStore,
      currentTrackId: 't1',
      queue: ['t1', 't2'],
      duration: 100,
    };
    tracksRef.current = [
      { id: 't1', title: 'Test Track', artist: 'Test Artist', sourceType: 'local', localUrl: 'blob:test', format: 'mp3', duration: 100, size: 1000, createdAt: 0, updatedAt: 0, favorite: false },
      { id: 't2', title: 'Next Track', artist: 'Test Artist', sourceType: 'local', localUrl: 'blob:test-2', format: 'mp3', duration: 100, size: 1000, createdAt: 0, updatedAt: 0, favorite: false },
    ];

    const { Player } = await import('../src/pages/Player');
    render(<MemoryRouter><Player /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /queue \/ up next/i }));
    expect(screen.getByRole('heading', { name: /queue \/ up next/i })).toBeInTheDocument();
  });
});
