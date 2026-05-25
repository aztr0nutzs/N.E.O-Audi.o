import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../src/store/useLibraryStore', () => ({
  useLibraryStore: (sel: any) => sel({ tracks: [{id:'t1',title:'Track One',artist:'Artist',sourceType:'downloaded',localUrl:'blob:x',format:'mp3',duration:10,size:10,createdAt:0,updatedAt:0,favorite:false}], playlists: [], removeTrack: vi.fn(), addPlaylist: vi.fn(), updatePlaylist: vi.fn() })
}));
vi.mock('../src/store/usePlayerStore', () => ({ usePlayerStore: () => vi.fn() }));
vi.mock('../src/lib/utils', () => ({ cn: (...a: string[]) => a.filter(Boolean).join(' '), formatDuration: () => '00:00' }));

describe('Library smoke', () => {
  it('renders archive vault categories and details action', async () => {
    const { Library } = await import('../src/pages/Library');
    render(<MemoryRouter><Library /></MemoryRouter>);
    expect(screen.getByText(/downloaded/i)).toBeInTheDocument();
    expect(screen.getByText(/recently added/i)).toBeInTheDocument();
    expect(screen.getByText(/lossless/i)).toBeInTheDocument();
    expect(screen.getByText(/mood packs/i)).toBeInTheDocument();
    expect(screen.getByText(/playlists/i)).toBeInTheDocument();
    fireEvent.click(screen.getByText(/downloaded/i));
    expect(screen.getByRole('button', { name: /track details/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /metadata lab/i })).toBeInTheDocument();
  });
});
