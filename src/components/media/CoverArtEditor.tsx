import { useRef, useState } from 'react';
import { ImagePlus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Track } from '../../types';
import { useLibraryStore } from '../../store/useLibraryStore';
import { CoverArt } from './CoverArt';

interface CoverArtEditorProps {
  track: Track;
  onUpdated?: (track: Track) => void;
}

const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

export function CoverArtEditor({ track, onUpdated }: CoverArtEditorProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const uploadCoverArt = useLibraryStore(state => state.uploadCoverArt);
  const removeCoverArt = useLibraryStore(state => state.removeCoverArt);
  const [busy, setBusy] = useState(false);
  const hasCover = !!(track.coverArtUrl || track.coverArt);

  const handleFile = async (file?: File) => {
    if (!file) return;
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error('Use PNG, JPG, or WebP cover art.');
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      toast.error('Cover art must be 5 MB or smaller.');
      return;
    }
    setBusy(true);
    try {
      const updated = await uploadCoverArt(track.id, file);
      onUpdated?.(updated);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleRemove = async () => {
    setBusy(true);
    try {
      const updated = await removeCoverArt(track.id);
      onUpdated?.(updated);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="cyber-panel border-neo-cyan/30 bg-black/40 p-3">
      <div className="flex items-center gap-3">
        <CoverArt track={track} size="lg" active={hasCover} />
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-black uppercase tracking-widest text-neo-cyan">Cover Art Core</h3>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-gray-400">
            Source: {track.coverArtSource || (hasCover ? 'legacy' : 'generated')}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
              className="flex items-center gap-2 border border-neo-cyan px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-neo-cyan hover:bg-neo-cyan/10 disabled:opacity-40"
            >
              <ImagePlus className="h-4 w-4" />
              Upload / Replace Cover
            </button>
            {hasCover && (
              <button
                type="button"
                disabled={busy}
                onClick={handleRemove}
                className="flex items-center gap-2 border border-neo-magenta px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-neo-magenta hover:bg-neo-magenta/10 disabled:opacity-40"
              >
                <Trash2 className="h-4 w-4" />
                Remove Cover
              </button>
            )}
          </div>
          <input
            ref={inputRef}
            aria-label="Upload cover art"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            onChange={event => handleFile(event.target.files?.[0])}
          />
        </div>
      </div>
    </section>
  );
}

