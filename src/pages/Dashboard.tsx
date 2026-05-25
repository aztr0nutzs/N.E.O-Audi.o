import { useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { NeoAudioHeader } from '../components/layout/NeoAudioHeader';
import { NeoImageButton } from '../components/ui/NeoImageButton';
import { NEO_AUDIO_BUTTONS } from '../lib/neoAudioAssets';
import { usePlayerStore } from '../store/usePlayerStore';
import { useLibraryStore } from '../store/useLibraryStore';
import { useDownloadStore } from '../store/useDownloadStore';
import { useEqualizerStore } from '../store/useEqualizerStore';
import { useAnalyzerStore } from '../store/useAnalyzerStore';
import { cn, formatDuration } from '../lib/utils';

const ACTIVE_JOB_STATUSES = new Set(['queued', 'analyzing', 'downloading', 'converting', 'indexing']);

function formatBytes(bytes: number): string {
  if (!bytes) return '0 B';
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), sizes.length - 1);
  return `${(bytes / (1024 ** i)).toFixed(i === 0 ? 0 : 2)} ${sizes[i]}`;
}

function deterministicBars(seed: string, count = 32) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 33 + seed.charCodeAt(i)) >>> 0;
  return Array.from({ length: count }).map((_, idx) => {
    const v = (Math.sin(hash + idx * 2.17) + 1) / 2;
    return Math.round(24 + v * 66);
  });
}

export function Dashboard() {
  const navigate = useNavigate();
  const setAnalyzerOpen = useAnalyzerStore(state => state.setAnalyzerOpen);

  const {
    currentTrackId,
    isPlaying,
    progress,
    duration,
    repeat,
    shuffle,
    volume,
    playbackSpeed,
    analyserNode,
    pause,
    resume,
    stop,
  } = usePlayerStore();

  const { tracks, playlists, loadLibrary } = useLibraryStore();
  const { jobs, loadJobs } = useDownloadStore();
  const { isOn, activePreset, bandValues, spatial } = useEqualizerStore();

  const currentTrack = useMemo(() => tracks.find((t) => t.id === currentTrackId) || null, [tracks, currentTrackId]);

  useEffect(() => {
    if (!tracks.length) loadLibrary();
    if (!jobs.length) loadJobs();
  }, [tracks.length, jobs.length, loadLibrary, loadJobs]);

  const activeJobs = useMemo(() => jobs.filter((j) => ACTIVE_JOB_STATUSES.has(j.status)), [jobs]);
  const queuedJobs = useMemo(() => jobs.filter((j) => j.status === 'queued'), [jobs]);
  const failedJobs = useMemo(() => jobs.filter((j) => j.status === 'failed'), [jobs]);
  const completedJobs = useMemo(() => jobs.filter((j) => j.status === 'complete'), [jobs]);

  const recentOps = useMemo(
    () => [...activeJobs, ...failedJobs].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 3),
    [activeJobs, failedJobs]
  );

  const totalDuration = useMemo(() => tracks.reduce((acc, t) => acc + (t.duration || 0), 0), [tracks]);
  const totalSize = useMemo(() => tracks.reduce((acc, t) => acc + (t.size || 0), 0), [tracks]);
  const recentlyAddedCount = useMemo(() => {
    const dayMs = 24 * 60 * 60 * 1000;
    const cutoff = Date.now() - dayMs;
    return tracks.filter((t) => (t.createdAt || 0) >= cutoff).length;
  }, [tracks]);
  const favoriteCount = useMemo(() => tracks.filter((t) => t.favorite).length, [tracks]);

  const avgGain = useMemo(() => {
    if (!bandValues.length) return 0;
    return bandValues.reduce((a, b) => a + b, 0) / bandValues.length;
  }, [bandValues]);

  const reactorBarsRef = useRef<(HTMLDivElement | null)[]>([]);
  const fallbackBars = useMemo(
    () => deterministicBars(`${currentTrackId || 'none'}-${activeJobs.length}-${failedJobs.length}`),
    [currentTrackId, activeJobs.length, failedJobs.length]
  );

  useEffect(() => {
    let frame = 0;
    if (analyserNode && isPlaying) {
      const data = new Uint8Array(analyserNode.frequencyBinCount);
      const tick = () => {
        analyserNode.getByteFrequencyData(data);
        const step = Math.max(1, Math.floor(data.length / fallbackBars.length));
        fallbackBars.forEach((_, i) => {
          const val = data[i * step] || 0;
          const h = Math.max(18, Math.round((val / 255) * 100));
          if (reactorBarsRef.current[i]) reactorBarsRef.current[i]!.style.height = `${h}%`;
        });
        frame = requestAnimationFrame(tick);
      };
      tick();
      return () => cancelAnimationFrame(frame);
    }

    fallbackBars.forEach((h, i) => {
      if (reactorBarsRef.current[i]) reactorBarsRef.current[i]!.style.height = `${h}%`;
    });
  }, [analyserNode, isPlaying, fallbackBars]);

  const reactorState = failedJobs.length
    ? 'alert'
    : activeJobs.length
      ? 'downloading'
      : isPlaying
        ? 'playing'
        : tracks.length
          ? 'idle'
          : 'standby';

  return (
    <div className="space-y-4 md:space-y-6 pb-28">
      <NeoAudioHeader className="mb-4" alt="N.E.O Audio Lab dashboard" />

      <section className="armored-frame p-4 md:p-6 bg-[#080910] border-neo-cyan/30">
        <h1 className="text-2xl md:text-4xl font-black italic tracking-widest text-neo-cyan uppercase">N.E.O AUDIO COMMAND CENTER</h1>
        <p className="text-[11px] md:text-xs font-mono tracking-[0.2em] text-neo-magenta uppercase">SIGNAL / LIBRARY / ENGINE STATUS</p>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="cyber-panel p-4 lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold tracking-widest text-neo-cyan uppercase">Center Reactor Status</h2>
            <span className={cn('text-[10px] font-mono uppercase tracking-widest', reactorState === 'alert' ? 'text-orange-400' : reactorState === 'playing' ? 'text-neo-lime' : 'text-gray-400')}>
              {reactorState}
            </span>
          </div>
          <div className={cn('relative h-44 md:h-56 border rounded-xl bg-black/50 overflow-hidden', reactorState === 'alert' ? 'border-orange-500/60 shadow-[0_0_18px_rgba(249,115,22,0.35)]' : 'border-neo-cyan/30')}>
            <div className={cn('absolute inset-6 rounded-full border', reactorState === 'downloading' ? 'animate-spin border-neo-magenta/50' : 'border-neo-cyan/30')} />
            <div className={cn('absolute inset-10 rounded-full', reactorState === 'playing' ? 'shadow-[0_0_30px_rgba(0,240,255,0.35)]' : reactorState === 'alert' ? 'shadow-[0_0_30px_rgba(249,115,22,0.35)]' : 'shadow-[0_0_18px_rgba(148,163,184,0.25)]')} />
            <div className="absolute inset-0 flex items-end gap-1 p-4">
              {fallbackBars.map((_, i) => (
                <div
                  key={i}
                  ref={(el) => {
                    reactorBarsRef.current[i] = el;
                  }}
                  className={cn('flex-1 rounded-t transition-all duration-200', reactorState === 'alert' ? 'bg-gradient-to-t from-orange-500 via-red-500 to-transparent' : 'bg-gradient-to-t from-neo-cyan via-neo-magenta to-transparent')}
                  style={{ height: '24%' }}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="cyber-panel p-4">
          <h2 className="text-sm font-bold tracking-widest text-neo-lime uppercase mb-3">Now Playing</h2>
          {currentTrack ? (
            <div className="space-y-2 text-sm">
              <p className="font-bold text-white truncate">{currentTrack.title}</p>
              <p className="text-neo-cyan truncate uppercase text-xs tracking-wider">{currentTrack.artist}</p>
              <p className="font-mono text-xs">{currentTrack.format.toUpperCase()} / {currentTrack.bitrate ? `${currentTrack.bitrate}kbps` : 'UNKNOWN'}</p>
              <p className="font-mono text-xs">{formatDuration((progress || 0) * (duration || currentTrack.duration || 0))} / {formatDuration(duration || currentTrack.duration || 0)}</p>
              <div className="flex gap-2 flex-wrap pt-1">
                <NeoImageButton src={isPlaying ? NEO_AUDIO_BUTTONS.pause : NEO_AUDIO_BUTTONS.play} alt="Play pause" label="Play/Pause" size="sm" onClick={isPlaying ? pause : resume} />
                <NeoImageButton src={NEO_AUDIO_BUTTONS.stop} alt="Stop" label="Stop" size="sm" onClick={stop} />
                <NeoImageButton src={NEO_AUDIO_BUTTONS.eq} alt="Open Player" label="Open Player" size="sm" onClick={() => navigate('/player')} />
                <NeoImageButton src={NEO_AUDIO_BUTTONS.playlist} alt="Open Track Lab" label="Open Track Lab" size="sm" onClick={() => navigate(`/track/${currentTrack.id}`)} />
              </div>
            </div>
          ) : (
            <p className="font-mono text-xs text-gray-400 tracking-widest">NO ACTIVE SIGNAL</p>
          )}
          <div className="mt-3 border-t border-gray-800 pt-2 text-[10px] font-mono text-gray-400 uppercase tracking-wider">
            REPEAT: {repeat} · SHUFFLE: {shuffle ? 'ON' : 'OFF'} · VOL: {Math.round(volume * 100)}% · SPD: {playbackSpeed}x
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <div className="cyber-panel p-4">
          <h3 className="text-sm font-bold tracking-widest uppercase text-neo-magenta mb-2">Download Operations</h3>
          <p className="text-xs font-mono">Active: {activeJobs.length} · Queued: {queuedJobs.length}</p>
          <p className={cn('text-xs font-mono', failedJobs.length ? 'text-orange-400' : 'text-gray-300')}>Failed: {failedJobs.length} · Completed: {completedJobs.length}</p>
          <div className="mt-2 space-y-1">
            {recentOps.length ? recentOps.map((job) => (
              <div key={job.id} className={cn('text-[10px] font-mono border p-2 rounded truncate', job.status === 'failed' ? 'border-orange-500/40 text-orange-300' : 'border-gray-800 text-neo-cyan')}>
                {job.status.toUpperCase()} · {job.phase || 'signal'}
              </div>
            )) : <p className="text-[10px] text-gray-500 font-mono">No active operations.</p>}
          </div>
          <button className="mt-3 px-3 py-2 border border-neo-magenta text-neo-magenta text-xs" onClick={() => navigate('/download')}>Open Downloader</button>
        </div>

        <div className="cyber-panel p-4">
          <h3 className="text-sm font-bold tracking-widest uppercase text-neo-cyan mb-2">Library Intelligence</h3>
          <p className="text-xs font-mono">Tracks: {tracks.length} · Playlists: {playlists.length}</p>
          <p className="text-xs font-mono">Duration: {formatDuration(totalDuration)} · Storage: {formatBytes(totalSize)}</p>
          <p className="text-xs font-mono">Recently Added: {recentlyAddedCount} · Favorites: {favoriteCount}</p>
          <button className="mt-3 px-3 py-2 border border-neo-cyan text-neo-cyan text-xs" onClick={() => navigate('/library')}>Open Library</button>
        </div>

        <div className="cyber-panel p-4">
          <h3 className="text-sm font-bold tracking-widest uppercase text-neo-lime mb-2">EQ / Signal Chain</h3>
          <p className="text-xs font-mono">EQ: {isOn ? 'ENABLED' : 'DISABLED'}</p>
          <p className="text-xs font-mono">Preset: {activePreset}</p>
          <p className="text-xs font-mono">Gain: {Math.abs(avgGain) < 0.01 ? 'Flat' : `${avgGain.toFixed(1)} dB avg`}</p>
          <p className="text-xs font-mono">Spatial: {typeof spatial === 'number' ? spatial.toFixed(2) : 'N/A'}</p>
          <button className="mt-3 px-3 py-2 border border-neo-lime text-neo-lime text-xs" onClick={() => navigate('/equalizer')}>Open Equalizer</button>
        </div>
      </section>

      <section className="cyber-panel p-4">
        <h3 className="text-sm font-bold tracking-widest uppercase text-white mb-3">Quick Actions</h3>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-2">
          <NeoImageButton src={NEO_AUDIO_BUTTONS.download} alt="Downloader" label="Open Downloader" size="sm" onClick={() => navigate('/download')} />
          <NeoImageButton src={NEO_AUDIO_BUTTONS.playlist} alt="Library" label="Open Library" size="sm" onClick={() => navigate('/library')} />
          <NeoImageButton src={NEO_AUDIO_BUTTONS.play} alt="Player" label="Open Player" size="sm" onClick={() => navigate('/player')} />
          <NeoImageButton src={NEO_AUDIO_BUTTONS.equalizer} alt="Equalizer" label="Open Equalizer" size="sm" onClick={() => navigate('/equalizer')} />
          <NeoImageButton src={NEO_AUDIO_BUTTONS.eq} alt="Analyzer" label="Live Analyzer" size="sm" onClick={() => setAnalyzerOpen(true)} />
          <NeoImageButton src={NEO_AUDIO_BUTTONS.settings} alt="Settings" label="Open Settings" size="sm" onClick={() => navigate('/settings')} />
          <NeoImageButton src={NEO_AUDIO_BUTTONS.download} alt="Upload" label="Upload Track" size="sm" onClick={() => navigate('/upload')} />
          <NeoImageButton src={NEO_AUDIO_BUTTONS.playlist} alt="Create Playlist" label="Create Playlist (Coming soon)" size="sm" disabled />
        </div>
      </section>

      <section className="cyber-panel p-4">
        <h3 className="text-sm font-bold tracking-widest uppercase text-neo-yellow mb-3">Recent Activity</h3>
        {tracks.length ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {[...tracks].sort((a, b) => b.createdAt - a.createdAt).slice(0, 3).map((track) => (
              <button key={track.id} className="text-left border border-gray-800 p-2 rounded hover:border-neo-yellow/50" onClick={() => navigate(`/track/${track.id}`)}>
                <p className="text-xs font-bold text-white truncate">{track.title}</p>
                <p className="text-[10px] font-mono text-neo-cyan truncate">{track.artist}</p>
              </button>
            ))}
          </div>
        ) : (
          <p className="text-xs font-mono tracking-widest text-gray-500">NO RECENT SIGNALS INDEXED</p>
        )}
      </section>
    </div>
  );
}
