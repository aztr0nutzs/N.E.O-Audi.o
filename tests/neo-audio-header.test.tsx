import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { NeoAudioHeader } from '../src/components/layout/NeoAudioHeader';

describe('NeoAudioHeader', () => {
  it('renders header3 art with aria-label', () => {
    render(<NeoAudioHeader variant="header3" alt="N.E.O Audio Lab dashboard" />);
    const header = screen.getByRole('img', { name: /n\.e\.o audio lab dashboard/i });
    expect(header).toBeInTheDocument();
    expect(header).toHaveClass('neo-header-plate');
    const img = header.querySelector('img');
    expect(img).toHaveClass('object-contain');
    expect(img?.getAttribute('src')).toContain('neo_audio_header3.png');
  });

  it('renders header4 art with aria-label', () => {
    render(<NeoAudioHeader variant="header4" alt="N.E.O Audio Lab player" />);
    const header = screen.getByRole('img', { name: /n\.e\.o audio lab player/i });
    expect(header).toBeInTheDocument();
    expect(header).toHaveClass('neo-header-plate');
    const img = header.querySelector('img');
    expect(img).toHaveClass('object-contain');
    expect(img?.getAttribute('src')).toContain('neo_audio_header4.png');
  });
});
