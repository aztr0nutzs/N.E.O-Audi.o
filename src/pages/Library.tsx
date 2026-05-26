import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { NeoAudioHeader } from '../components/layout/NeoAudioHeader';
import { useLibraryStore } from '../store/useLibraryStore';
import { useDownloadStore } from '../store/useDownloadStore';
import { usePlayerStore } from '../store/usePlayerStore';
import { formatDuration } from '../lib/utils';
import { CoverArt } from '../components/media/CoverArt';

type LibraryTab = 'tracks' | 'playlists' | 'downloads' | 'mood' | 'recent';

export function Library() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<LibraryTab>('tracks');
  const [showTechnical, setShowTechnical] = useState(false);
  const { tracks, playlists, backendStatus, backendMessage, loadLibrary } = useLibraryStore();
  const { jobs = [] } = useDownloadStore();
  const { playTrack, addToQueue } = usePlayerStore();

  const recentTracks = useMemo(() => [...tracks].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)).slice(0, 20), [tracks]);

  const renderTrackRows = (rows = tracks) => rows.length ? (
    <div className="space-y-2">
      {rows.map(track => (
        <div key={track.id} className="rounded-xl border border-neo-cyan/20 bg-black/45 p-2.5">
          <div className="flex items-center gap-3">
            <CoverArt track={track} size="md" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-white">{track.title}</p>
              <p className="truncate text-xs uppercase tracking-wider text-neo-cyan">{track.artist || 'Unknown Artist'}</p>
            </div>
            <button onClick={() => playTrack(track.id)} className="min-h-12 rounded-lg border border-neo-magenta/70 px-3 text-sm text-neo-magenta">Play</button>
            <button aria-label={`Add ${track.title} to queue`} onClick={() => addToQueue(track.id)} className="min-h-12 rounded-lg border border-neo-lime/60 px-3 text-sm text-neo-lime">Queue</button>
          </div>
          <p className="mt-2 text-[11px] font-mono text-gray-300">{track.format.toUpperCase()} · {formatDuration(track.duration || 0)}</p>
        </div>
      ))}
    </div>
  ) : <p className="rounded-xl border border-gray-700 bg-black/35 p-4 text-sm text-gray-300">No tracks found in this section.</p>;

  const isOffline = backendStatus === 'offline';

  return (
    <div className="space-y-3">
      <NeoAudioHeader variant="header4" alt="N.E.O Audio Lab library" />
      <section className="armored-frame bg-[#080910]/90 px-3 py-3">
        <h1 className="text-2xl font-black uppercase tracking-wider text-neo-cyan">N.E.O Archive Vault</h1>
        <p className="text-xs uppercase tracking-[0.18em] text-neo-magenta">Tracks · Playlists · Downloads · Mood Packs · Recent</p>
      </section>

      <section className="grid grid-cols-5 gap-1" data-testid="library-tabs">
        {(['tracks', 'playlists', 'downloads', 'mood', 'recent'] as LibraryTab[]).map(item => (
          <button key={item} onClick={() => setTab(item)} className={`min-h-12 rounded-lg border text-[11px] font-bold uppercase tracking-wider ${tab === item ? 'border-neo-cyan bg-neo-cyan/15 text-neo-cyan' : 'border-gray-700 bg-black/30 text-gray-200'}`}>
            {item === 'mood' ? 'Mood Packs' : item}
          </button>
        ))}
      </section>

      {isOffline ? (
        <section className="rounded-xl border border-neo-magenta/40 bg-black/55 p-4" data-testid="library-offline-state">
          <h2 className="text-lg font-bold text-neo-magenta">Library backend unavailable.</h2>
          <p className="mt-2 text-sm text-gray-200">This Android build needs a reachable N.E.O backend API or local-device library mode.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button onClick={() => navigate('/settings')} className="min-h-12 rounded-lg border border-neo-cyan/70 px-3 text-sm text-neo-cyan">Open Settings</button>
            <button onClick={() => loadLibrary()} className="min-h-12 rounded-lg border border-neo-lime/70 px-3 text-sm text-neo-lime">Retry Backend</button>
            <button onClick={() => navigate('/upload')} className="min-h-12 rounded-lg border border-neo-yellow/70 px-3 text-sm text-neo-yellow">Open Upload</button>
          </div>
          <button onClick={() => setShowTechnical(v => !v)} className="mt-3 text-xs text-gray-300 underline">{showTechnical ? 'Hide technical details' : 'Show technical details'}</button>
          {showTechnical && <pre className="mt-2 overflow-auto rounded bg-black/70 p-2 text-[11px] text-gray-300">{backendMessage || 'No technical details available.'}</pre>}
        </section>
      ) : (
        <section>
          {tab === 'tracks' && renderTrackRows(tracks)}
          {tab === 'playlists' && <p className="rounded-xl border border-gray-700 bg-black/35 p-4 text-sm text-gray-300">{playlists.length} playlist(s) available.</p>}
          {tab === 'downloads' && <p className="rounded-xl border border-gray-700 bg-black/35 p-4 text-sm text-gray-300">{jobs.length} download job(s) tracked.</p>}
          {tab === 'mood' && <p className="rounded-xl border border-gray-700 bg-black/35 p-4 text-sm text-gray-300">Mood pack browsing is available from track metadata tags.</p>}
          {tab === 'recent' && renderTrackRows(recentTracks)}
        </section>
      )}
    </div>
  );
}
