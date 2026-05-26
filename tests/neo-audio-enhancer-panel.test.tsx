import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { NeoAudioEnhancerPanel } from '../src/components/audio/NeoAudioEnhancerPanel';

describe('NeoAudioEnhancerPanel', () => {
  it('renders core controls', () => {
    render(<NeoAudioEnhancerPanel />);
    expect(screen.getByText(/N.E.O AUDIO ENHANCER/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Clean Boost/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Intensity/i)).toBeInTheDocument();
    expect(screen.getByText(/Limiter:/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Capture A/i })).toBeInTheDocument();
  });
});
