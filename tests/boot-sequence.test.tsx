import { act, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BootSequence, NEO_BOOT_SEQUENCE_DURATION_MS } from '../src/components/startup/BootSequence';

describe('BootSequence', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('renders the initial system initializing boot frame', () => {
    render(<BootSequence onComplete={vi.fn()} />);

    expect(screen.getByTestId('boot-sequence')).toHaveAttribute('data-stage', 'initializing');
    expect(screen.getByText(/system initializing/i)).toBeInTheDocument();
    expect(screen.getByAltText(/n\.e\.o audio lab logo/i)).toHaveAttribute(
      'src',
      expect.stringContaining('neo_audio_header1.png'),
    );
    expect(screen.getByAltText(/system initializing artwork/i)).toHaveAttribute(
      'src',
      expect.stringContaining('neo_audio_boot_initializing.png'),
    );
  });

  it('transitions through loading and hero stages', () => {
    render(<BootSequence onComplete={vi.fn()} />);

    act(() => {
      vi.advanceTimersByTime(1200);
    });

    expect(screen.getByTestId('boot-sequence')).toHaveAttribute('data-stage', 'loading');
    expect(screen.getByText(/audio lab loading/i)).toBeInTheDocument();
    expect(screen.getByText(/loading n\.e\.o audio lab/i)).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1100);
    });

    expect(screen.getByTestId('boot-sequence')).toHaveAttribute('data-stage', 'ready');
    expect(screen.getByText(/audio lab ready/i)).toBeInTheDocument();
    expect(screen.getByAltText(/n\.e\.o audio lab logo/i)).toBeInTheDocument();
    expect(screen.getByAltText(/hero artwork/i)).toHaveAttribute('src', expect.stringContaining('neo_audio_boot.png'));
  });

  it('eventually completes after the short startup flow', () => {
    const onComplete = vi.fn();
    render(<BootSequence onComplete={onComplete} />);

    act(() => {
      vi.advanceTimersByTime(NEO_BOOT_SEQUENCE_DURATION_MS + 300);
    });

    expect(onComplete).toHaveBeenCalled();
  });

  it('falls back to a branded loading mark when the active image fails', () => {
    render(<BootSequence onComplete={vi.fn()} />);

    fireEvent.error(screen.getByAltText(/system initializing artwork/i));

    expect(screen.getByRole('img', { name: /startup artwork fallback/i })).toBeInTheDocument();
    expect(screen.getByText('N.E.O')).toBeInTheDocument();
  });
});
