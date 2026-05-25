import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../src/store/useLibraryStore', () => ({
  useLibraryStore: (sel: any) => sel({
    tracks: [
      { id: 'a', title: 'Alpha', artist: 'Artist A', sourceType: 'local', localUrl: '', format: 'mp3', duration: 120, size: 1, createdAt: 1, updatedAt: 1, favorite: false },
      { id: 'b', title: 'Beta', artist: 'Artist B', sourceType: 'local', localUrl: '', format: 'mp3', duration: 90, size: 1, createdAt: 2, updatedAt: 2, favorite: false },
    ],
  }),
}));
vi.mock('../src/store/useDownloadStore', () => ({ useDownloadStore: (sel: any) => sel({ jobs: [] }) }));
vi.mock('../src/store/usePlayerStore', () => ({
  usePlayerStore: (sel: any) => sel({ currentTrackId: 'a', queue: ['a', 'b'], queueIndex: 0 }),
}));
vi.mock('../src/components/ui/ReactorCoreVisual', () => ({ ReactorCoreVisual: () => <div data-testid="reactor" /> }));
vi.mock('../src/lib/utils', () => ({ cn: (...a: string[]) => a.filter(Boolean).join(' '), formatDuration: () => '00:00' }));
vi.mock('motion/react', () => ({ motion: { div: (props: any) => <div {...props} /> } }));

describe('Dashboard smoke', () => {
  it('renders Up Next section', async () => {
    const { Dashboard } = await import('../src/pages/Dashboard');
    render(<MemoryRouter><Dashboard /></MemoryRouter>);
    expect(screen.getByText(/up next/i)).toBeInTheDocument();
    expect(screen.getAllByText('Beta').length).toBeGreaterThan(0);
  });
});
