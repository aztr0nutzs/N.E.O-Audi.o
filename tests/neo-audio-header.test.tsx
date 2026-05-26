import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { NeoAudioHeader } from '../src/components/layout/NeoAudioHeader';

describe('NeoAudioHeader', () => {
  it('renders header art with aria-label', () => {
    render(<NeoAudioHeader alt="N.E.O Audio Lab player" />);
    const header = screen.getByRole('img', { name: /n\.e\.o audio lab player/i });
    expect(header).toBeInTheDocument();
    expect(header).toHaveClass('neo-header-plate');
    const imgs = header.querySelectorAll('img');
    expect(imgs.length).toBeGreaterThan(0);
    expect(imgs[0]).toHaveClass('object-contain');
    const srcs = Array.from(imgs).map(i => i.getAttribute('src') ?? '');
    expect(srcs.some(s => s.includes('neo_audio_header1.png') || s.includes('neo_audio_header2.png'))).toBe(true);
  });
});
