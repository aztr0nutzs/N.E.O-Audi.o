import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { EqCurvePreview } from '../src/components/equalizer/EqCurvePreview';

describe('EqCurvePreview', () => {
  it('renders an SVG preview for 10 band values', () => {
    render(<EqCurvePreview label="Test Curve" bandValues={[0, 1, 2, 3, 4, 3, 2, 1, 0, -1]} active />);
    const svg = screen.getByRole('img', { name: /test curve curve preview/i });
    expect(svg).toBeInTheDocument();
    expect(svg.querySelectorAll('circle')).toHaveLength(10);
  });
});
