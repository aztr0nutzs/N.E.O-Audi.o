import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { NeoAudioHeader } from '../components/layout/NeoAudioHeader';
import { useLibraryStore } from '../store/useLibraryStore';
import { usePlayerStore } from '../store/usePlayerStore';
import { formatDuration } from '../lib/utils';
import { NeoImageButton } from '../components/ui/NeoImageButton';
import { NEO_AUDIO_BUTTONS } from '../lib/neoAudioAssets';
import toast from 'react-hot-toast';
import { MetadataLab } from '../components/library/MetadataLab';

const hashBars = (seed: string, count = 48) => {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return Array.from({ length: count }).map((_, i) => {
    const n = (Math.sin(hash + i * 1.618) + 1) / 2;
    return Math.round(18 + n * 62);
  });
};

export function TrackDetail() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { tracks, isLoading, loadLibrary, updateTrack, removeTrack } = useLibraryStore();
  const { currentTrackId, isPlaying, playTrack, pause, resume, addToQueue, analyserNode } = usePlayerStore();
  const track = tracks.find((t) => t.id === id);
  const [isEditing, setIsEditing] = useState(false);
  const [metadataOpen, setMetadataOpen] = useState(false);
  const [form, setForm] = useState({ title: '', artist: '', album: '', genre: '', favorite: false });
  const [bars, setBars] = useState<number[]>([]);

  useEffect(() => {
    if (!tracks.length && isLoading) loadLibrary();
  }, [tracks.length, isLoading, loadLibrary]);

  useEffect(() => {
    if (track) {
      setForm({ title: track.title, artist: track.artist, album: track.album || '', genre: track.genre || '', favorite: track.favorite });
    }
  }, [track]);

  const staticBars = useMemo(() => hashBars(track ? `${track.title}-${track.artist}` : id), [track, id]);

  useEffect(() => {
    if (!analyserNode || !isPlaying || currentTrackId !== track?.id) {
      setBars(staticBars);
      return;
    }
    const data = new Uint8Array(analyserNode.frequencyBinCount);
    let raf = 0;
    const draw = () => {
      analyserNode.getByteFrequencyData(data);
      const step = Math.max(1, Math.floor(data.length / staticBars.length));
      setBars(staticBars.map((_, i) => Math.max(16, Math.round((data[i * step] / 255) * 100))));
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [analyserNode, currentTrackId, isPlaying, staticBars, track?.id]);

  if (!track && !isLoading) {
    return <div className="max-w-3xl mx-auto p-4 min-h-[calc(100vh-100px)] flex flex-col items-center justify-center gap-4">
      <NeoAudioHeader className="w-full" alt="N.E.O Audio Lab track detail" />
      <div className="armored-frame p-8 w-full text-center bg-black/50 border-neo-magenta/40">
        <h1 className="text-3xl font-black italic tracking-widest text-neo-magenta">TRACK SIGNAL LOST</h1>
        <p className="font-mono text-xs text-gray-400 mt-2">Signal id: {id}</p>
        <Link to="/library" className="inline-block mt-6 px-4 py-2 border border-neo-cyan text-neo-cyan hover:bg-neo-cyan/10">Return to Library</Link>
      </div>
  </div>;
  }

  if (!track) return null;

  const isCurrent = currentTrackId === track.id;
  const togglePlay = () => {
    if (!isCurrent) playTrack(track.id, tracks.map((t) => t.id));
    else if (isPlaying) pause();
    else resume();
  };

  const save = async () => {
    const title = form.title.trim();
    if (!title) return toast.error('Title cannot be empty');
    try {
      await updateTrack(track.id, { ...form, title, artist: form.artist.trim(), album: form.album.trim(), genre: form.genre.trim() });
      setIsEditing(false);
      toast.success('Metadata updated');
    } catch {
      toast.error('Failed to update metadata');
    }
  };

  return <div className="max-w-4xl mx-auto min-h-[calc(100vh-100px)] p-3 md:p-5 pb-24 space-y-4">
    <NeoAudioHeader className="w-full" alt="N.E.O Audio Lab track detail" />
    <div className="armored-frame p-3 md:p-5 bg-[#07080f] border-neo-cyan/30">
      <h1 className="text-2xl md:text-4xl font-black italic text-neo-cyan tracking-widest">TRACK AUDIO LAB</h1>
      <p className="font-mono text-xs text-neo-magenta tracking-widest">SIGNAL PROFILE / METADATA CORE</p>
    </div>
    <div className="grid md:grid-cols-[280px,1fr] gap-4">
      <div className={`cyber-panel p-4 ${isCurrent && isPlaying ? 'animate-pulse border-neo-lime/50' : ''}`}>
        {track.coverArt ? <img src={track.coverArt} alt={`${track.title} cover`} className="w-full aspect-square object-cover rounded-lg border border-neo-cyan/30" /> :
          <div className="w-full aspect-square rounded-lg border border-neo-cyan/40 flex items-center justify-center bg-gradient-to-br from-neo-cyan/20 via-neo-magenta/20 to-neo-lime/20">
            <span className="text-4xl font-black italic text-white">{track.title.split(' ').map((p) => p[0]).join('').slice(0, 3).toUpperCase()}</span>
          </div>}
      </div>
      <div className="cyber-panel p-4 space-y-3">
        <h2 className="text-xl font-bold text-white">{track.title}</h2>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>Artist: <span className="text-neo-cyan">{track.artist}</span></div><div>Album: <span className="text-neo-cyan">{track.album || 'Unknown'}</span></div>
          <div>Genre/Mood: <span className="text-neo-cyan">{track.genre || 'Unclassified'}</span></div><div>Duration: <span className="text-neo-cyan">{formatDuration(track.duration)}</span></div>
          <div>Format: <span className="text-neo-cyan uppercase">{track.format}</span></div><div>Bitrate: <span className="text-neo-cyan">{track.bitrate ? `${track.bitrate} kbps` : 'Unknown'}</span></div>
          <div>File size: <span className="text-neo-cyan">{(track.size / (1024 * 1024)).toFixed(2)} MB</span></div><div>Source type: <span className="text-neo-cyan uppercase">{track.sourceType}</span></div>
          <div>Date added: <span className="text-neo-cyan">{new Date(track.createdAt).toLocaleString()}</span></div>
        </div>
      </div>
    </div>
    <div className="cyber-panel p-4">
      <p className="font-mono text-xs text-neo-lime mb-2">WAVEFORM / ANALYZER</p>
      <div className="h-28 flex items-end gap-1 rounded bg-black/40 p-2 border border-gray-800">{(bars.length ? bars : staticBars).map((h, i) => <div key={i} className="flex-1 rounded-t bg-gradient-to-t from-neo-cyan via-neo-magenta to-transparent" style={{ height: `${h}%` }} />)}</div>
    </div>
    <div className="grid md:grid-cols-2 gap-4">
      <div className="cyber-panel p-4 space-y-2">
        <p className="text-neo-cyan text-sm">Source: {track.sourceUrl ? <a className="underline break-all" href={track.sourceUrl}>{track.sourceUrl}</a> : 'No remote source'}</p>
        <p className="text-sm">Status: <span className="text-neo-lime">{track.sourceType === 'downloaded' ? 'Downloaded' : 'Local'}</span></p>
        <p className="text-sm">Verification: <span className="text-neo-cyan">{track.format.toUpperCase()} / {track.bitrate ? `${track.bitrate}kbps` : 'N/A'}</span></p>
        {track.sourceType === 'downloaded' && <button className="px-3 py-2 border border-neo-magenta text-neo-magenta" onClick={() => navigate('/download')}>Open Downloader</button>}
      </div>
      <div className="cyber-panel p-4">
        <div className="flex flex-wrap gap-2">
          <NeoImageButton src={isPlaying && isCurrent ? NEO_AUDIO_BUTTONS.pause : NEO_AUDIO_BUTTONS.play} alt="Play pause" label="Play / Pause" size="sm" onClick={togglePlay} />
          <NeoImageButton src={NEO_AUDIO_BUTTONS.playlist} alt="Queue" label="Add to Queue" size="sm" onClick={() => addToQueue(track.id)} />
          <NeoImageButton src={NEO_AUDIO_BUTTONS.eq} alt="Player" label="Open Player" size="sm" onClick={() => navigate('/player')} />
          <NeoImageButton src={NEO_AUDIO_BUTTONS.equalizer} alt="Equalizer" label="Open Equalizer" size="sm" onClick={() => navigate('/equalizer')} />
          <NeoImageButton src={NEO_AUDIO_BUTTONS.settings} alt="Edit" label="Edit Metadata" size="sm" onClick={() => setMetadataOpen(true)} />
          <NeoImageButton src={NEO_AUDIO_BUTTONS.stop} alt="Delete" label="Delete Track" size="sm" onClick={async () => { await removeTrack(track.id); navigate('/library'); }} />
          <NeoImageButton src={NEO_AUDIO_BUTTONS.previous} alt="Back" label="Back to Library" size="sm" onClick={() => navigate('/library')} />
        </div>
        {isEditing && <div className="mt-4 grid grid-cols-1 gap-2">
          {(['title', 'artist', 'album', 'genre'] as const).map((field) => <input key={field} value={(form as any)[field]} onChange={(e) => setForm((s) => ({ ...s, [field]: e.target.value }))} placeholder={field.toUpperCase()} className="bg-black border border-gray-700 p-2" />)}
          <label className="text-sm"><input type="checkbox" checked={form.favorite} onChange={(e) => setForm((s) => ({ ...s, favorite: e.target.checked }))} /> Favorite</label>
          <div className="flex gap-2"><button className="px-3 py-2 border border-neo-lime text-neo-lime" onClick={save}>Save Metadata</button><button className="px-3 py-2 border" onClick={() => setIsEditing(false)}>Cancel</button></div>
        </div>}
      </div>
    </div>
    {track && <MetadataLab track={track} open={metadataOpen} onClose={() => setMetadataOpen(false)} onSave={(patch) => updateTrack(track.id, patch)} />}
  </div>;
}
