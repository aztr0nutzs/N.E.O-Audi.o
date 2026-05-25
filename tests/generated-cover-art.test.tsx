import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { GeneratedCoverArt } from '../src/components/media/GeneratedCoverArt';

describe('GeneratedCoverArt', () => {
  it('renders a deterministic fallback for title and artist', () => {
    const first = render(<GeneratedCoverArt title="Neon Signal" artist="Unit 7" />);
    const html = first.container.innerHTML;
    first.unmount();
    const second = render(<GeneratedCoverArt title="Neon Signal" artist="Unit 7" />);
    expect(second.container.innerHTML).toBe(html);
    expect(screen.getByLabelText(/neon signal generated cover art/i)).toBeInTheDocument();
  });

  it('does not crash with an empty artist', () => {
    render(<GeneratedCoverArt title="Solo Grid" />);
    expect(screen.getByTestId('generated-cover-art')).toBeInTheDocument();
  });
});

