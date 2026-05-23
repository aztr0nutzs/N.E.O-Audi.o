import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../src/store/useLibraryStore', () => ({
  useLibraryStore: (sel: any) => sel({ tracks: [], playlists: [], removeTrack: vi.fn(), addPlaylist: vi.fn(), updatePlaylist: vi.fn() })
}));
vi.mock('../src/store/usePlayerStore', () => ({ usePlayerStore: () => vi.fn() }));
vi.mock('../src/lib/utils', () => ({ cn: (...a: string[]) => a.filter(Boolean).join(' '), formatDuration: () => '00:00' }));

describe('Library smoke', () => {
  it('renders archive vault categories', async () => {
    const { Library } = await import('../src/pages/Library');
    render(<MemoryRouter><Library /></MemoryRouter>);
    expect(screen.getByText(/downloaded/i)).toBeInTheDocument();
    expect(screen.getByText(/recently added/i)).toBeInTheDocument();
    expect(screen.getByText(/lossless/i)).toBeInTheDocument();
    expect(screen.getByText(/mood packs/i)).toBeInTheDocument();
    expect(screen.getByText(/playlists/i)).toBeInTheDocument();
  });
});
