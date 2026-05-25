import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { DownloadJobDiagnosticsDrawer } from '../src/components/downloader/DownloadJobDiagnosticsDrawer';

vi.mock('../src/lib/utils', () => ({ cn: (...a: string[]) => a.filter(Boolean).join(' ') }));

const baseJob = {
  id: 'abcd-1234-efgh-5678',
  sourceUrl: 'https://example.com/audio',
  status: 'complete',
  progress: 100,
  phase: 'Complete',
  format: 'mp3',
  bitrate: 320,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  outputFilename: 'a.mp3',
  resultTrackId: 'track-1',
  actualBitrate: 320,
  actualDuration: 123,
  logs: ['line1', 'line2']
} as any;

describe('DownloadJobDiagnosticsDrawer', () => {
  it('renders diagnostics content and toggles logs', () => {
    render(<DownloadJobDiagnosticsDrawer job={baseJob} expanded onToggle={vi.fn()} />);
    expect(screen.getByText(/status:/i)).toBeInTheDocument();
    expect(screen.getAllByText(/phase:/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/https:\/\/example.com\/audio/i)).toBeInTheDocument();
    expect(screen.getByText(/requested bitrate: 320 kbps/i)).toBeInTheDocument();
    expect(screen.getByText(/track-1/i)).toBeInTheDocument();
    const btn = screen.getByRole('button', { name: /show logs/i });
    fireEvent.click(btn);
    expect(screen.getByText('line1')).toBeInTheDocument();
  });

  it('renders error details when failed', () => {
    render(<DownloadJobDiagnosticsDrawer job={{ ...baseJob, status: 'failed', errorCode: 'download_failed', error: 'boom' }} expanded onToggle={vi.fn()} />);
    expect(screen.getAllByText(/download_failed/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/boom/i).length).toBeGreaterThan(0);
  });
});
