import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../store/usePlayerStore', () => ({
  usePlayerStore: () => ({
    currentTrackId: null, isPlaying: false, pause: vi.fn(), resume: vi.fn(), next: vi.fn(), previous: vi.fn(), progress: 0, volume: 1,
    setVolume: vi.fn(), repeat: 'off', toggleRepeat: vi.fn(), shuffle: false, toggleShuffle: vi.fn(), seekTo: vi.fn(), analyserNode: null,
    error: null, duration: 0, playbackSpeed: 1, setSpeed: vi.fn(),
  })
}));
vi.mock('../store/useLibraryStore', () => ({ useLibraryStore: (sel: any) => sel({ tracks: [] }) }));
vi.mock('../components/ui/ReactorCoreVisual', () => ({ ReactorCoreVisual: () => <div data-testid="reactor" /> }));
vi.mock('../lib/utils', () => ({ cn: (...a: string[]) => a.filter(Boolean).join(' '), formatDuration: () => '00:00' }));
vi.mock('motion/react', () => ({ motion: { div: (props: any) => <div {...props} /> } }));

describe('Player smoke', () => {
  it('renders idle state safely', async () => {
    const { Player } = await import('../Player');
    render(<MemoryRouter><Player /></MemoryRouter>);
    expect(screen.getByText(/awaiting signal/i)).toBeInTheDocument();
  });
});
