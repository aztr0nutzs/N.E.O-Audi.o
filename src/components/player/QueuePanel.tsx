import { useMemo, useState } from 'react';
import type React from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ArrowDown,
  ArrowUp,
  Library,
  Play,
  Plus,
  Save,
  Shuffle,
  Trash2,
  X,
} from 'lucide-react';
import { usePlayerStore } from '../../store/usePlayerStore';
import { useLibraryStore } from '../../store/useLibraryStore';
import { formatDuration, cn } from '../../lib/utils';
import { Track } from '../../types';
import { CoverArt } from '../media/CoverArt';

interface QueuePanelProps {
  open?: boolean;
  onClose?: () => void;
  mode?: 'panel' | 'inline' | 'drawer';
}

const defaultQueueName = () => `Queue Mix ${new Date().toISOString().slice(0, 10)}`;

export function QueuePanel({ open = true, onClose, mode = 'panel' }: QueuePanelProps) {
  const navigate = useNavigate();
  const {
    currentTrackId,
    queue,
    queueIndex,
    history,
    playQueueFromIndex,
    removeFromQueue,
    moveQueueItem,
    clearQueue,
    clearHistory,
    shuffleQueue,
    saveQueueSnapshot,
    addManyToQueue,
  } = usePlayerStore();
  const tracks = useLibraryStore(state => state.tracks);
  const addPlaylist = useLibraryStore(state => state.addPlaylist);
  const [isSaving, setIsSaving] = useState(false);
  const [playlistName, setPlaylistName] = useState(defaultQueueName);

  const trackMap = useMemo(() => new Map(tracks.map(track => [track.id, track])), [tracks]);
  const currentTrack = currentTrackId ? trackMap.get(currentTrackId) : null;
  const currentIndex = currentTrackId ? queue.indexOf(currentTrackId) : -1;
  const activeQueueIndex = currentIndex !== -1 ? currentIndex : queueIndex;
  const upcomingIds = currentTrackId && activeQueueIndex !== -1 ? queue.slice(activeQueueIndex + 1) : queue;
  const upcoming = upcomingIds
    .map((id, offset) => ({ id, queueIndex: activeQueueIndex + offset + 1, track: trackMap.get(id) }))
    .filter(item => item.track) as Array<{ id: string; queueIndex: number; track: Track }>;
  const historyTracks = history
    .slice()
    .reverse()
    .map(id => trackMap.get(id))
    .filter(Boolean) as Track[];
  const recentTrackIds = useMemo(
    () => [...tracks].sort((a, b) => b.createdAt - a.createdAt).slice(0, 5).map(track => track.id),
    [tracks],
  );

  if (!open && mode !== 'inline') return null;

  const handleSavePlaylist = async () => {
    const name = playlistName.trim() || defaultQueueName();
    const snapshot = saveQueueSnapshot();
    const start = snapshot.currentTrackId ? snapshot.queue.indexOf(snapshot.currentTrackId) : -1;
    const queueTrackIds = start !== -1 ? snapshot.queue.slice(start + 1) : snapshot.queue;
    const trackIds = Array.from(new Set([
      ...(snapshot.currentTrackId ? [snapshot.currentTrackId] : []),
      ...queueTrackIds,
    ]));

    if (trackIds.length === 0) {
      toast.error('Queue is empty.');
      return;
    }

    try {
      await addPlaylist({
        id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `playlist-${Date.now()}`,
        name,
        trackIds,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      setIsSaving(false);
      setPlaylistName(defaultQueueName());
      toast.success('Queue saved as playlist.');
    } catch (error) {
      console.error(error);
      toast.error('Unable to save queue.');
    }
  };

  const panel = (
    <section
      aria-label="Queue / Up Next"
      className={cn(
        'cyber-panel border-neo-cyan/40 bg-[#050508]/95 p-4 text-white shadow-[0_0_25px_rgba(0,240,255,0.18)]',
        mode === 'drawer' ? 'h-full w-full max-w-md overflow-y-auto rounded-none border-l' : 'w-full rounded-lg',
      )}
    >
      <div className="mb-4 flex items-start justify-between gap-3 border-b border-neo-cyan/20 pb-3">
        <div>
          <h2 className="text-lg font-black italic uppercase tracking-widest text-neo-cyan drop-shadow-[0_0_8px_currentColor]">
            Queue / Up Next
          </h2>
          <p className="font-mono text-[10px] uppercase tracking-widest text-gray-500">
            {upcoming.length} upcoming / {history.length} logged
          </p>
        </div>
        {onClose && (
          <button
            type="button"
            aria-label="Close queue"
            onClick={onClose}
            className="rounded border border-neo-magenta/50 bg-black p-2 text-neo-magenta hover:bg-neo-magenta/10"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
        <QueueAction icon={<Trash2 className="h-4 w-4" />} label="Clear Queue" onClick={clearQueue} />
        <QueueAction icon={<Shuffle className="h-4 w-4" />} label="Shuffle Queue" onClick={shuffleQueue} />
        <QueueAction icon={<Save className="h-4 w-4" />} label="Save Playlist" onClick={() => setIsSaving(true)} />
        <QueueAction icon={<Trash2 className="h-4 w-4" />} label="Clear History" onClick={clearHistory} />
        <QueueAction icon={<Library className="h-4 w-4" />} label="Open Library" onClick={() => navigate('/library')} />
        <QueueAction icon={<Plus className="h-4 w-4" />} label="Add Recent" onClick={() => addManyToQueue(recentTrackIds)} />
      </div>

      {isSaving && (
        <div className="mb-4 flex flex-col gap-2 border border-neo-yellow/30 bg-black/70 p-3 sm:flex-row">
          <input
            aria-label="Playlist name"
            value={playlistName}
            onChange={event => setPlaylistName(event.target.value)}
            className="min-w-0 flex-1 border border-gray-800 bg-black px-3 py-2 font-mono text-xs uppercase tracking-widest text-white outline-none focus:border-neo-yellow"
          />
          <button
            type="button"
            onClick={handleSavePlaylist}
            className="border border-neo-yellow bg-neo-yellow px-3 py-2 text-xs font-bold uppercase tracking-widest text-black"
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => setIsSaving(false)}
            className="border border-gray-700 bg-gray-900 px-3 py-2 text-xs font-bold uppercase tracking-widest text-white"
          >
            Cancel
          </button>
        </div>
      )}

      <div className="space-y-5">
        <QueueSection title="Current Signal">
          {currentTrack ? (
            <TrackRow active track={currentTrack} />
          ) : (
            <EmptySignal text="NO CURRENT SIGNAL" />
          )}
        </QueueSection>

        <QueueSection title="Up Next">
          {upcoming.length > 0 ? (
            <div className="space-y-2">
              {upcoming.map((item, index) => (
                <TrackRow
                  key={`${item.id}-${item.queueIndex}`}
                  track={item.track}
                  onPlay={() => playQueueFromIndex(item.queueIndex)}
                  onRemove={() => removeFromQueue(item.id)}
                  onMoveUp={() => moveQueueItem(item.queueIndex, item.queueIndex - 1)}
                  onMoveDown={() => moveQueueItem(item.queueIndex, item.queueIndex + 1)}
                  disableMoveUp={index === 0}
                  disableMoveDown={index === upcoming.length - 1}
                />
              ))}
            </div>
          ) : (
            <EmptySignal text="QUEUE EMPTY / NO UPCOMING SIGNALS" />
          )}
        </QueueSection>

        <QueueSection title="History">
          {historyTracks.length > 0 ? (
            <div className="space-y-2">
              {historyTracks.map((track, index) => (
                <TrackRow key={`${track.id}-history-${index}`} track={track} dimmed />
              ))}
            </div>
          ) : (
            <EmptySignal text="NO HISTORY LOGGED" />
          )}
        </QueueSection>
      </div>
    </section>
  );

  if (mode === 'drawer') {
    return (
      <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm">
        {panel}
      </div>
    );
  }

  return panel;
}

function QueueSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 font-mono text-[10px] uppercase tracking-[0.24em] text-neo-lime">
        {title}
      </h3>
      {children}
    </div>
  );
}

function QueueAction({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-10 items-center justify-center gap-2 border border-gray-800 bg-black/70 px-2 py-2 text-[10px] font-bold uppercase tracking-widest text-gray-200 transition-colors hover:border-neo-cyan hover:text-neo-cyan"
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function TrackRow({
  track,
  active,
  dimmed,
  onPlay,
  onRemove,
  onMoveUp,
  onMoveDown,
  disableMoveUp,
  disableMoveDown,
}: {
  key?: React.Key;
  track: Track;
  active?: boolean;
  dimmed?: boolean;
  onPlay?: () => void;
  onRemove?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  disableMoveUp?: boolean;
  disableMoveDown?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 border bg-[#060608] p-3 sm:flex-row sm:items-center',
        active ? 'border-neo-cyan shadow-[0_0_18px_rgba(0,240,255,0.28)]' : 'border-gray-800',
        dimmed && 'opacity-55',
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <CoverArt track={track} size="sm" active={active} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-bold uppercase tracking-widest text-white">{track.title}</div>
          <div className="truncate font-mono text-[10px] uppercase tracking-widest text-gray-400">{track.artist}</div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-neo-cyan/80">
            {formatDuration(track.duration)} / {track.format}{track.bitrate ? ` / ${track.bitrate}KBPS` : ''}
          </div>
        </div>
      </div>

      {(onPlay || onRemove || onMoveUp || onMoveDown) && (
        <div className="flex shrink-0 justify-end gap-2">
          {onPlay && (
            <IconButton label={`Play ${track.title}`} onClick={onPlay}>
              <Play className="h-4 w-4" />
            </IconButton>
          )}
          {onMoveUp && (
            <IconButton label={`Move ${track.title} up`} onClick={onMoveUp} disabled={disableMoveUp}>
              <ArrowUp className="h-4 w-4" />
            </IconButton>
          )}
          {onMoveDown && (
            <IconButton label={`Move ${track.title} down`} onClick={onMoveDown} disabled={disableMoveDown}>
              <ArrowDown className="h-4 w-4" />
            </IconButton>
          )}
          {onRemove && (
            <IconButton label={`Remove ${track.title} from queue`} onClick={onRemove}>
              <Trash2 className="h-4 w-4" />
            </IconButton>
          )}
        </div>
      )}
    </div>
  );
}

function IconButton({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="flex h-9 w-9 items-center justify-center border border-gray-800 bg-black text-gray-300 transition-colors hover:border-neo-cyan hover:text-neo-cyan disabled:cursor-not-allowed disabled:opacity-35"
    >
      {children}
    </button>
  );
}

function EmptySignal({ text }: { text: string }) {
  return (
    <div className="border border-dashed border-gray-800 bg-black/40 p-4 text-center font-mono text-xs uppercase tracking-widest text-gray-500">
      {text}
    </div>
  );
}
