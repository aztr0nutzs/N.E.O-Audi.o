import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { BottomDock } from '../src/components/layout/BottomDock';

describe('BottomDock', () => {
  it('renders real app navigation without image dock/chat/games', () => {
    render(<MemoryRouter><BottomDock /></MemoryRouter>);
    expect(screen.queryByTestId('bottom-dock-image')).not.toBeInTheDocument();
    expect(screen.getByTestId('bottom-nav')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /home/i })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: /library/i })).toHaveAttribute('href', '/library');
    expect(screen.getByRole('link', { name: /player/i })).toHaveAttribute('href', '/player');
    expect(screen.getByRole('link', { name: /download/i })).toHaveAttribute('href', '/download');
    expect(screen.getByRole('link', { name: /equalizer/i })).toHaveAttribute('href', '/equalizer');
    expect(screen.queryByText(/chat/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/games/i)).not.toBeInTheDocument();
  });

  it('exposes upload/settings via more tray', () => {
    render(<MemoryRouter><BottomDock /></MemoryRouter>);
    fireEvent.click(screen.getByTestId('bottom-nav-more'));
    expect(screen.getByRole('link', { name: /upload/i })).toHaveAttribute('href', '/upload');
    expect(screen.getByRole('link', { name: /settings/i })).toHaveAttribute('href', '/settings');
  });
});
