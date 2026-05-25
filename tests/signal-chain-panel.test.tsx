import { describe, expect, it, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { SignalChainPanel } from '../src/components/audio/SignalChainPanel';
import { useSignalChainStore } from '../src/store/useSignalChainStore';

describe('SignalChainPanel', () => {
  beforeEach(() => {
    useSignalChainStore.getState().resetSignalChain();
  });

  it('renders all modules and output controls', () => {
    render(<SignalChainPanel />);
    ['EQ', 'Bass Enhancer', 'Spatial', 'Compressor', 'Limiter', 'Night Mode', 'Vocal Clarity'].forEach(label => {
      expect(screen.getByText(label)).toBeInTheDocument();
    });
    expect(screen.getByLabelText(/output gain/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /clipping protection on/i })).toBeInTheDocument();
  });

  it('toggles a module and exposes intensity sliders', () => {
    render(<SignalChainPanel />);
    fireEvent.click(screen.getAllByRole('button', { name: /bypassed/i })[0]);
    expect(useSignalChainStore.getState().modules.bass.enabled).toBe(true);
    expect(screen.getByLabelText(/bass enhancer intensity/i)).toBeInTheDocument();
  });
});

