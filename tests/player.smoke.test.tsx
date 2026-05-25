import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';

let playerState: any;
let libraryState: any;

vi.mock('../src/store/usePlayerStore', () => ({
  usePlayerStore: () => playerState || ({
    currentTrackId: null, queue: [], queueIndex: 0, history: [], isPlaying: false, pause: vi.fn(), resume: vi.fn(), next: vi.fn(), previous: vi.fn(), progress: 0, volume: 1,
    setVolume: vi.fn(), repeat: 'off', toggleRepeat: vi.fn(), shuffle: false, toggleShuffle: vi.fn(), seekTo: vi.fn(), analyserNode: null,
    error: null, duration: 0, playbackSpeed: 1, setSpeed: vi.fn(), playQueueFromIndex: vi.fn(), removeFromQueue: vi.fn(), moveQueueItem: vi.fn(),
    clearQueue: vi.fn(), clearHistory: vi.fn(), shuffleQueue: vi.fn(), saveQueueSnapshot: vi.fn(() => ({ currentTrackId: null, queue: [], history: [] })),
    addManyToQueue: vi.fn(),
  })
}));
vi.mock('../src/store/useLibraryStore', () => ({ useLibraryStore: (sel: any) => sel(libraryState || { tracks: [], addPlaylist: vi.fn() }) }));
vi.mock('../src/components/ui/ReactorCoreVisual', () => ({ ReactorCoreVisual: () => <div data-testid="reactor" /> }));
vi.mock('../src/lib/utils', () => ({ cn: (...a: string[]) => a.filter(Boolean).join(' '), formatDuration: () => '00:00' }));
vi.mock('motion/react', () => ({ motion: { div: (props: any) => <div {...props} /> } }));

describe('Player smoke', () => {
  it('renders idle state safely', async () => {
    playerState = null;
    libraryState = { tracks: [], addPlaylist: vi.fn() };
    const { Player } = await import('../src/pages/Player');
    render(<MemoryRouter><Player /></MemoryRouter>);
    expect(screen.getByText(/awaiting signal/i)).toBeInTheDocument();
  });

  it('opens queue panel from the player', async () => {
    playerState = {
      currentTrackId: 'a', queue: ['a', 'b'], queueIndex: 0, history: [], isPlaying: true, pause: vi.fn(), resume: vi.fn(), next: vi.fn(), previous: vi.fn(),
      progress: 0, volume: 1, setVolume: vi.fn(), repeat: 'off', toggleRepeat: vi.fn(), shuffle: false, toggleShuffle: vi.fn(), seekTo: vi.fn(),
      analyserNode: null, error: null, duration: 0, playbackSpeed: 1, setSpeed: vi.fn(), playQueueFromIndex: vi.fn(), removeFromQueue: vi.fn(),
      moveQueueItem: vi.fn(), clearQueue: vi.fn(), clearHistory: vi.fn(), shuffleQueue: vi.fn(), saveQueueSnapshot: vi.fn(() => ({ currentTrackId: 'a', queue: ['a', 'b'], history: [] })),
      addManyToQueue: vi.fn(),
    };
    libraryState = {
      tracks: [
        { id: 'a', title: 'Alpha', artist: 'Artist A', sourceType: 'local', localUrl: '', format: 'mp3', duration: 120, size: 1, createdAt: 1, updatedAt: 1, favorite: false },
        { id: 'b', title: 'Beta', artist: 'Artist B', sourceType: 'local', localUrl: '', format: 'mp3', duration: 120, size: 1, createdAt: 1, updatedAt: 1, favorite: false },
      ],
      addPlaylist: vi.fn(),
    };
    const { Player } = await import('../src/pages/Player');
    render(<MemoryRouter><Player /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /queue/i }));
    expect(screen.getByLabelText(/queue \/ up next/i)).toBeInTheDocument();
  });
});
