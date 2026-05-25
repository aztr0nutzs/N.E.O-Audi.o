import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

const track: any = { id:'t1', title:'Track', artist:'Artist', sourceType:'local', localUrl:'blob:x', format:'mp3', duration:100, size:10, createdAt:0, updatedAt:0, favorite:false };

describe('MetadataLab', () => {
  it('renders fields and validates title, mood chip, tags, save/cancel', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    const { MetadataLab } = await import('../src/components/library/MetadataLab');
    render(<MetadataLab track={track} open onClose={onClose} onSave={onSave} />);
    expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
    fireEvent.click(screen.getByText(/chill/i));
    fireEvent.change(screen.getByLabelText(/tag input/i), { target: { value: 'neo' } });
    fireEvent.click(screen.getByText(/add tag/i));
    expect(screen.getByText(/neo ×/i)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: '' } });
    fireEvent.click(screen.getByText(/^save$/i));
    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: 'Updated' } });
    fireEvent.click(screen.getByText(/^save$/i));
    expect(onSave).toHaveBeenCalled();
    fireEvent.click(screen.getByText(/cancel/i));
    expect(onClose).toHaveBeenCalled();
  });
});
