import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { CoverArtEditor } from '../src/components/media/CoverArtEditor';
import { Track } from '../src/types';

const uploadCoverArt = vi.fn();
const removeCoverArt = vi.fn();

vi.mock('../src/store/useLibraryStore', () => ({
  useLibraryStore: (sel: any) => sel({ uploadCoverArt, removeCoverArt }),
}));

const track: Track = {
  id: 't1',
  title: 'Editor Track',
  artist: 'Editor Artist',
  sourceType: 'local',
  localUrl: 'blob:x',
  format: 'mp3',
  duration: 120,
  size: 1000,
  createdAt: 1,
  updatedAt: 1,
  favorite: false,
};

describe('CoverArtEditor', () => {
  it('renders upload input and action', () => {
    render(<CoverArtEditor track={track} />);
    expect(screen.getByLabelText(/upload cover art/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /upload \/ replace cover/i })).toBeInTheDocument();
  });

  it('shows remove button when a cover exists', () => {
    render(<CoverArtEditor track={{ ...track, coverArtUrl: '/api/covers/t1.jpg', coverArtSource: 'uploaded' }} />);
    expect(screen.getByRole('button', { name: /remove cover/i })).toBeInTheDocument();
  });
});

