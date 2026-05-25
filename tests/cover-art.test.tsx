import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { CoverArt } from '../src/components/media/CoverArt';
import { Track } from '../src/types';

const baseTrack: Track = {
  id: 't1',
  title: 'Cover Track',
  artist: 'Cover Artist',
  sourceType: 'local',
  localUrl: 'blob:x',
  format: 'mp3',
  duration: 120,
  size: 1000,
  createdAt: 1,
  updatedAt: 1,
  favorite: false,
};

describe('CoverArt', () => {
  it('renders an image when coverArtUrl exists', () => {
    render(<CoverArt track={{ ...baseTrack, coverArtUrl: '/api/covers/test.jpg' }} />);
    expect(screen.getByRole('img', { name: /cover track cover art/i })).toHaveAttribute('src', '/api/covers/test.jpg');
  });

  it('falls back when no coverArtUrl exists', () => {
    render(<CoverArt track={baseTrack} />);
    expect(screen.getByTestId('generated-cover-art')).toBeInTheDocument();
  });
});

