import React, { useState, useMemo } from 'react';
import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useLibraryStore } from '../store/useLibraryStore';
import { usePlayerStore } from '../store/usePlayerStore';
import { Search, Play, Trash2, Download, Clock, Activity, Smile, Music, Shield, ChevronLeft, MoreVertical, Folder, Edit3 as EditIcon, Plus, X, ListPlus, AlertCircle } from 'lucide-react';
import { formatDuration } from '../lib/utils';
import { cn } from '../lib/utils';
import { Track, LOSSLESS_FORMATS } from '../types';
import { NeoAudioHeader } from '../components/layout/NeoAudioHeader';
import { MetadataLab } from '../components/library/MetadataLab';
import { CoverArt } from '../components/media/CoverArt';
import { buildMoodPacks, buildSmartPlaylists, getMoodColor } from '../lib/smartPlaylists';
import { MoodPack, SmartPlaylistId } from '../types';

const VaultNode = ({ title, subtitle, icon, color, className, onClick }: { title: string, subtitle: string, icon: React.ReactNode, color: string, className?: string, onClick?: () => void }) => {
   const colorMap: any = {
     cyan: 'border-neo-cyan text-neo-cyan shadow-[0_0_15px_rgba(0,240,255,0.3)]',
     magenta: 'border-neo-magenta text-neo-magenta shadow-[0_0_15px_rgba(255,0,255,0.3)]',
     blue: 'border-[rgba(0,128,255,0.8)] text-[rgba(0,128,255,0.8)] shadow-[0_0_15px_rgba(0,128,255,0.3)]',
     lime: 'border-neo-lime text-neo-lime shadow-[0_0_15px_rgba(57,255,20,0.3)]',
     yellow: 'border-neo-yellow text-neo-yellow shadow-[0_0_15px_rgba(252,226,5,0.3)]',
   };
   return (
     <button onClick={onClick} className={cn("cyber-panel p-4 flex flex-col items-center justify-center transition-transform hover:scale-105 group relative border-2", colorMap[color]?.split(' ')[0], className)}>
        <div className={cn("w-12 h-12 mb-2 flex items-center justify-center rounded-lg border-2 bg-black/50 z-10 drop-shadow-[0_0_8px_currentColor]", colorMap[color])}>
           {icon}
        </div>
        <h3 className="font-bold tracking-widest uppercase italic text-sm md:text-md text-white z-10 text-center drop-shadow-[0_0_5px_currentColor]">
           {title}
        </h3>
        <p className={cn("font-mono text-[10px] tracking-widest lowercase z-10", colorMap[color]?.split(' ')[1])}>
           {subtitle}
        </p>
     </button>
   );
};

const accentClass = (color?: string) => {
   const map: Record<string, string> = {
      cyan: 'border-neo-cyan/40 text-neo-cyan hover:border-neo-cyan',
      magenta: 'border-neo-magenta/40 text-neo-magenta hover:border-neo-magenta',
      lime: 'border-neo-lime/40 text-neo-lime hover:border-neo-lime',
      yellow: 'border-neo-yellow/40 text-neo-yellow hover:border-neo-yellow',
      blue: 'border-[rgba(0,128,255,0.45)] text-[rgba(0,128,255,0.9)] hover:border-[rgba(0,128,255,0.9)]',
   };
   return map[color || 'cyan'] || map.cyan;
};

function CollectionCard({
   title,
   description,
   count,
   color,
   tracks,
   onOpen,
   onPlay,
   onQueue,
}: {
   title: string;
   description: string;
   count: number;
   color?: string;
   tracks: Track[];
   onOpen: () => void;
   onPlay: () => void;
   onQueue: () => void;
}) {
   return (
      <div className={cn('border bg-[#060608] p-3 transition-colors hover:bg-[#0a0a0f]', accentClass(color))}>
         <button type="button" onClick={onOpen} className="w-full text-left">
            <div className="mb-3 flex -space-x-2">
               {tracks.slice(0, 4).map(track => (
                  <React.Fragment key={track.id}>
                     <CoverArt track={track} size="sm" className="border-black/80" />
                  </React.Fragment>
               ))}
               {tracks.length === 0 && (
                  <div className="flex h-10 w-10 items-center justify-center border border-gray-800 bg-black text-gray-600">
                     <Music className="h-5 w-5" />
                  </div>
               )}
            </div>
            <h3 className="truncate text-sm font-black uppercase italic tracking-widest text-white">{title}</h3>
            <p className="mt-1 line-clamp-2 font-mono text-[10px] uppercase tracking-widest text-gray-500">{description}</p>
            <p className="mt-2 font-mono text-[10px] uppercase tracking-widest">{count} TRACKS</p>
         </button>
         <div className="mt-3 grid grid-cols-3 gap-2">
            <button type="button" disabled={count === 0} onClick={onPlay} className="border border-gray-800 bg-black px-2 py-2 text-[10px] font-bold uppercase tracking-widest text-white hover:border-neo-cyan disabled:opacity-35">Play</button>
            <button type="button" disabled={count === 0} onClick={onQueue} className="border border-gray-800 bg-black px-2 py-2 text-[10px] font-bold uppercase tracking-widest text-white hover:border-neo-lime disabled:opacity-35">Queue</button>
            <button type="button" onClick={onOpen} className="border border-gray-800 bg-black px-2 py-2 text-[10px] font-bold uppercase tracking-widest text-white hover:border-neo-magenta">Open</button>
         </div>
      </div>
   );
}

export function Library() {
  const location = useLocation();
  const navigate = useNavigate();
  const tracks = useLibraryStore(state => state.tracks);
  const playlists = useLibraryStore(state => state.playlists);
  const backendStatus = useLibraryStore(state => state.backendStatus);
  const backendMessage = useLibraryStore(state => state.backendMessage);
  const removeTrack = useLibraryStore(state => state.removeTrack);
  const playTrack = usePlayerStore(state => state.playTrack);
  const addToQueue = usePlayerStore(state => state.addToQueue);
  const addManyToQueue = usePlayerStore(state => state.addManyToQueue);
  const currentTrackId = usePlayerStore(state => state.currentTrackId);
  const isPlaying = usePlayerStore(state => state.isPlaying);
  
  const [search, setSearch] = useState('');
  type ViewState = 'vault' | 'downloaded' | 'recently_added' | 'lossless' | 'smart_tracks' | 'mood_packs' | 'mood_tracks' | 'playlists' | 'playlist_tracks';
  const [view, setView] = useState<ViewState>('vault');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [editingTrack, setEditingTrack] = useState<string | null>(null);
  const [labTrackId, setLabTrackId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editArtist, setEditArtist] = useState('');
  const [editGenre, setEditGenre] = useState('');

  const [creatingPlaylist, setCreatingPlaylist] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [addingToPlaylistTrack, setAddingToPlaylistTrack] = useState<string | null>(null);
  const addPlaylist = useLibraryStore(state => state.addPlaylist);
  const updatePlaylist = useLibraryStore(state => state.updatePlaylist);

  const handleCreatePlaylist = async () => {
      if (!newPlaylistName.trim()) return;
      await addPlaylist({
          id: crypto.randomUUID(),
          name: newPlaylistName.trim(),
          trackIds: [],
          createdAt: Date.now(),
          updatedAt: Date.now()
      });
      setCreatingPlaylist(false);
      setNewPlaylistName('');
  };

  const handleEdit = (track: Track) => {
     setEditingTrack(track.id);
     setEditTitle(track.title || '');
     setEditArtist(track.artist || '');
     setEditGenre(track.genre || '');
  };

  const saveEdit = async (track: Track) => {
     try {
       await useLibraryStore.getState().updateTrack(track.id, {
          title: editTitle,
          artist: editArtist,
          genre: editGenre
       });
       setEditingTrack(null);
     } catch(e) {
       console.error("Failed to update track");
     }
  };

  const formatBytes = (bytes: number) => {
      if (bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const totalBytes = useMemo(() => tracks.reduce((acc, t) => acc + (t.size || 0), 0), [tracks]);
  const TOTAL_CAPACITY = 5 * 1024 * 1024 * 1024; // 5 GB
  const storagePercent = Math.min(100, Math.round((totalBytes / TOTAL_CAPACITY) * 100));
  const smartPlaylists = useMemo(() => buildSmartPlaylists(tracks), [tracks]);
  const moodPacks = useMemo(() => buildMoodPacks(tracks), [tracks]);
  const trackMap = useMemo(() => new Map(tracks.map(track => [track.id, track])), [tracks]);

  const handleBack = () => {
     if (view === 'mood_tracks') setView('mood_packs');
     else if (view === 'smart_tracks') setView('vault');
     else if (view === 'playlist_tracks') setView('playlists');
     else setView('vault');
     setSearch('');
  };

  const openSmartPlaylist = (id: SmartPlaylistId) => {
     setSelectedId(id);
     setView('smart_tracks');
     setSearch('');
  };

  const openMoodPack = (pack: MoodPack) => {
     setSelectedId(pack.id);
     setView('mood_tracks');
     setSearch('');
  };

  const playTrackIds = (trackIds: string[]) => {
     if (trackIds.length === 0) return;
     playTrack(trackIds[0], trackIds);
  };

  const displayedTracks = useMemo(() => {
     let filtered = tracks;
     if (search) {
       filtered = filtered.filter(t => 
         t.title.toLowerCase().includes(search.toLowerCase()) || 
         t.artist.toLowerCase().includes(search.toLowerCase())
       );
     }
     
     switch(view) {
        case 'downloaded':
           return filtered.filter(t => t.sourceType === 'downloaded');
        case 'recently_added':
           return [...filtered].sort((a, b) => b.createdAt - a.createdAt);
        case 'lossless':
           // Strictly truly-lossless formats. We intentionally do not include
           // high-bitrate lossy files (e.g. 320 kbps MP3) here — those are
           // still lossy and should not be presented as "verified" lossless.
           return filtered.filter(t => {
               const fmt = (t.format || '').toLowerCase();
               return (LOSSLESS_FORMATS as readonly string[]).includes(fmt);
           });
        case 'smart_tracks': {
           const smart = smartPlaylists.find(pack => pack.id === selectedId);
           if (!smart) return [];
           return smart.trackIds.map(id => filtered.find(t => t.id === id)).filter(Boolean) as Track[];
        }
        case 'mood_tracks':
           {
             const pack = moodPacks.find(item => item.id === selectedId || item.mood === selectedId);
             if (!pack) return [];
             return pack.trackIds.map(id => filtered.find(t => t.id === id)).filter(Boolean) as Track[];
           }
        case 'playlist_tracks': {
           const pl = playlists.find(p => p.id === selectedId);
           if (!pl) return [];
           return pl.trackIds.map(id => filtered.find(t => t.id === id)).filter(Boolean) as Track[];
        }
        default:
           return filtered;
     }
  }, [tracks, search, view, selectedId, playlists, smartPlaylists, moodPacks]);

  const filteredPlaylists = useMemo(() => {
     if (!search) return playlists;
     return playlists.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
  }, [playlists, search]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const trackId = params.get('trackId');
    const q = params.get('q');
    if (trackId || q) {
      setView('downloaded');
    }
    if (q) {
      setSearch(q);
    }
    if (trackId) {
      setSelectedId(trackId);
    }
  }, [location.search]);

  return (
    <div className="max-w-md md:max-w-4xl mx-auto min-h-[calc(100vh-100px)] p-2 md:p-4 flex flex-col items-center relative">

      <NeoAudioHeader className="w-full mb-4" alt="N.E.O Audio Lab library" />

      {/* Top Header */}
      <header className="w-full flex justify-between items-center z-20 mb-6 relative px-2">
         {view !== 'vault' ? (
           <button onClick={handleBack} className="w-10 h-10 flex items-center justify-center hex-btn border-neo-cyan text-neo-cyan hover:bg-neo-cyan/10">
              <ChevronLeft className="w-5 h-5" />
           </button>
         ) : <div className="w-10" />}
         
         <div className="flex bg-black px-4 py-1 border border-gray-800 rounded-full font-bold italic tracking-widest text-lg shadow-[0_0_10px_rgba(0,240,255,0.2)]">
            <span className="text-neo-cyan">N.</span>
            <span className="text-neo-magenta">E.</span>
            <span className="text-neo-lime">O.</span>
         </div>
         
         <button className="w-10 h-10 flex items-center justify-center hex-btn border-neo-magenta text-neo-magenta hover:bg-neo-magenta/10">
            <MoreVertical className="w-5 h-5" />
         </button>
      </header>

      {/* Main Container */}
      <div className="w-full relative armored-frame bg-[#0a0a0f] p-4 md:p-8 flex flex-col items-center flex-1 z-10 overflow-hidden">
         
         <h1 className="text-2xl md:text-5xl font-black italic tracking-widest uppercase mb-1 drop-shadow-[0_0_15px_#00f0ff] mt-4 text-center">
            <span className="text-neo-cyan">LIBRARY /</span><br/>
            <span className="text-neo-magenta">ARCHIVE VAULT</span>
         </h1>
         <div className="flex items-center justify-center gap-4 mb-12">
            <div className="h-px bg-neo-cyan w-8 md:w-12 opacity-50" />
            <p className="font-mono text-[9px] md:text-[10px] text-neo-cyan tracking-widest uppercase">
               Your data. Stored. Secured. Synced.
            </p>
            <div className="h-px w-8 md:w-12 bg-neo-cyan opacity-50" />
         </div>

         {backendStatus === 'offline' && (
            <div className="mb-6 flex w-full max-w-2xl items-start gap-3 border border-neo-magenta/50 bg-black/70 p-3 text-left shadow-[0_0_18px_rgba(255,0,255,0.18)]">
               <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-neo-magenta" />
               <div>
                  <p className="font-mono text-xs font-bold uppercase tracking-widest text-neo-magenta">Backend offline / configure API endpoint</p>
                  <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-gray-500">
                     {backendMessage || 'Server-powered library, upload, download, cover art, and stream features require a reachable N.E.O backend.'}
                  </p>
               </div>
            </div>
         )}

         {view === 'vault' ? (
           <div className="relative w-full max-w-lg mx-auto flex-1 min-h-[550px] mb-8">
              
              {/* Animated Connection Lines */}
              <svg className="absolute top-[30px] left-0 w-full h-[400px] pointer-events-none z-0" style={{ filter: 'drop-shadow(0 0 8px currentColor)' }}>
                 <path d="M 50% 100 L 50% 160 L 25% 160" fill="none" stroke="#ff00ff" strokeWidth="2" className="animate-[pulse_2s_infinite]" />
                 <path d="M 50% 100 L 50% 160 L 75% 160" fill="none" stroke="#00f0ff" strokeWidth="2" className="animate-[pulse_2s_infinite_0.5s]" />
                 <path d="M 50% 100 L 50% 210 L 25% 210 L 25% 320" fill="none" stroke="#0080ff" strokeWidth="2" className="opacity-70" />
                 <path d="M 50% 100 L 50% 210 L 75% 210 L 75% 320" fill="none" stroke="#39ff14" strokeWidth="2" className="opacity-70" />
                 <path d="M 50% 100 L 50% 410" fill="none" stroke="#fce205" strokeWidth="2" className="opacity-80" />
              </svg>

              {/* Central Core */}
              <div className="absolute left-1/2 -translate-x-1/2 top-4 w-32 h-32 md:w-40 md:h-40 rounded-full border-[6px] md:border-[8px] border-[#151520] shadow-[0_0_30px_#000] flex items-center justify-center z-20 bg-black">
                 <div className="absolute inset-[-6px] rounded-full border-t-4 border-b-4 border-neo-magenta animate-[spin_8s_linear_infinite]" />
                 <div className="absolute inset-[6px] rounded-full border-[3px] border-neo-cyan/40" />
                 <div className="absolute inset-[15px] rounded-full bg-[#050508] shadow-[inset_0_0_20px_#000] flex items-center justify-center">
                    <span className="text-5xl md:text-6xl font-black italic text-transparent bg-clip-text bg-gradient-to-br from-neo-cyan to-white drop-shadow-[0_0_15px_#00f0ff]">
                       N
                    </span>
                 </div>
              </div>

              {/* Hex Nodes */}
              <VaultNode 
                 title="DOWNLOADED" subtitle="indexed" icon={<Download />} color="magenta" 
                 className="absolute left-0 lg:left-[5%] top-[120px] w-[45%] lg:w-[35%]" onClick={() => setView('downloaded')} 
              />
              <VaultNode 
                 title="RECENTLY ADDED" subtitle="synced" icon={<Clock />} color="cyan" 
                 className="absolute right-0 lg:right-[5%] top-[120px] w-[45%] lg:w-[35%]" onClick={() => setView('recently_added')} 
              />
              <VaultNode 
                 title="LOSSLESS" subtitle="verified" icon={<Activity />} color="blue" 
                 className="absolute left-0 lg:left-[5%] top-[270px] w-[45%] lg:w-[35%]" onClick={() => setView('lossless')} 
              />
              <VaultNode 
                 title="MOOD PACKS" subtitle="cached" icon={<Smile />} color="lime" 
                 className="absolute right-0 lg:right-[5%] top-[270px] w-[45%] lg:w-[35%]" onClick={() => setView('mood_packs')} 
              />
              <VaultNode 
                 title="PLAYLISTS" subtitle="indexed" icon={<Music />} color="yellow" 
                 className="absolute left-1/2 -translate-x-1/2 top-[410px] w-[50%] lg:w-[40%]" onClick={() => setView('playlists')} 
              />
              <div className="relative z-20 pt-[540px] space-y-6">
                 <section>
                    <div className="mb-3 flex items-end justify-between gap-3">
                       <div>
                          <h2 className="text-sm font-black uppercase tracking-widest text-neo-cyan">SMART PLAYLISTS</h2>
                          <p className="font-mono text-[10px] uppercase tracking-widest text-gray-500">Auto-routed from real metadata and playback stats</p>
                       </div>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                       {smartPlaylists.slice(0, 12).map(pack => (
                          <React.Fragment key={pack.id}>
                          <CollectionCard
                            title={pack.name}
                            description={pack.ruleSummary}
                            count={pack.trackIds.length}
                            color={pack.color}
                            tracks={pack.trackIds.map(id => trackMap.get(id)).filter(Boolean) as Track[]}
                            onOpen={() => openSmartPlaylist(pack.id)}
                            onPlay={() => playTrackIds(pack.trackIds)}
                            onQueue={() => addManyToQueue(pack.trackIds)}
                          />
                          </React.Fragment>
                       ))}
                    </div>
                 </section>

                 <section>
                    <div className="mb-3 flex items-end justify-between gap-3">
                       <div>
                          <h2 className="text-sm font-black uppercase tracking-widest text-neo-lime">MOOD PACKS</h2>
                          <p className="font-mono text-[10px] uppercase tracking-widest text-gray-500">Grouped by mood first, then genre and tags</p>
                       </div>
                    </div>
                    {moodPacks.length ? (
                       <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          {moodPacks.slice(0, 8).map(pack => (
                             <React.Fragment key={pack.id}>
                             <CollectionCard
                               title={pack.name}
                               description={pack.description || 'Mood pack'}
                               count={pack.trackIds.length}
                               color={pack.color || getMoodColor(pack.mood)}
                               tracks={pack.trackIds.map(id => trackMap.get(id)).filter(Boolean) as Track[]}
                               onOpen={() => openMoodPack(pack)}
                               onPlay={() => playTrackIds(pack.trackIds)}
                               onQueue={() => addManyToQueue(pack.trackIds)}
                             />
                             </React.Fragment>
                          ))}
                       </div>
                    ) : (
                       <div className="border border-dashed border-neo-lime/20 bg-black/40 p-4 text-center font-mono text-xs uppercase tracking-widest text-neo-lime/50">
                          NO SIGNALS MATCH THIS PACK
                       </div>
                    )}
                 </section>
              </div>
           </div>
         ) : (
           <div className="w-full flex-1 flex flex-col h-[550px]">
              <div className="flex justify-center mb-6 z-20">
                 <div className="flex w-full max-w-xl flex-col items-center gap-3 sm:flex-row">
                    <div className="relative w-full max-w-sm hex-btn bg-[#050508] border-2 border-neo-cyan p-2 px-8 flex items-center shadow-[0_0_15px_rgba(0,240,255,0.4)]">
                       <Search className="w-5 h-5 text-neo-cyan mr-3" />
                       <input 
                         type="text"
                         placeholder={`SEARCH ${view.replace('_', ' ').toUpperCase()}...`}
                         className="bg-transparent border-none text-white text-md font-bold tracking-widest uppercase italic placeholder:text-neo-cyan/50 focus:outline-none w-full"
                         value={search}
                         onChange={(e) => setSearch(e.target.value)}
                       />
                    </div>
                    {displayedTracks.length > 0 && view !== 'mood_packs' && view !== 'playlists' && (
                       <button
                         type="button"
                         onClick={() => addManyToQueue(displayedTracks.map(track => track.id))}
                         className="flex items-center gap-2 border border-neo-lime/50 bg-black px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-neo-lime hover:bg-neo-lime/10"
                       >
                         <ListPlus className="w-4 h-4" />
                         Add All
                       </button>
                    )}
                 </div>
              </div>
              
              <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar flex-1 pb-4">
                 {(() => {
                    if (view === 'mood_packs') {
                       if (moodPacks.length === 0) return (
                          <div className="text-center flex flex-col items-center justify-center h-full text-neo-lime/50 font-mono tracking-widest text-lg border-2 border-dashed border-neo-lime/20 rounded-xl bg-black/40 p-8">
                             <Smile className="w-12 h-12 mb-4 opacity-50" />
                             NO SIGNALS MATCH THIS PACK
                             <p className="text-xs uppercase mt-4 max-w-xs text-gray-500">Edit track metadata to add genres and populate this vault.</p>
                          </div>
                       );
                       return moodPacks.filter(pack => !search || pack.name.toLowerCase().includes(search.toLowerCase())).map((pack) => {
                          const moodTrack = pack.trackIds.map(id => trackMap.get(id)).find(Boolean) as Track | undefined;
                          return (
                          <div key={pack.id} 
                             onClick={() => openMoodPack(pack)}
                             className="flex items-center gap-4 cursor-pointer group mb-2 border border-neo-lime/30 bg-[#060608] hover:bg-neo-lime/10 p-4 rounded-lg transition-colors">
                             {moodTrack ? <CoverArt track={moodTrack} size="md" /> : <div className="w-12 h-12 rounded border border-neo-lime text-neo-lime flex items-center justify-center bg-black">
                                <Smile className="w-6 h-6 drop-shadow-[0_0_5px_currentColor]" />
                             </div>}
                             <div className="flex-1">
                                <h3 className="text-lg font-bold tracking-widest text-white italic uppercase drop-shadow-[0_0_5px_currentColor]">
                                   {pack.name}
                                </h3>
                                <p className="text-xs font-mono tracking-widest text-neo-lime mt-1 uppercase">{pack.trackIds.length} TRACKS / PACK</p>
                             </div>
                             <div className="flex gap-2">
                                <button type="button" onClick={(e) => { e.stopPropagation(); playTrackIds(pack.trackIds); }} className="p-2 bg-gray-900 border border-gray-700 rounded hover:border-neo-cyan transition-colors" aria-label={`Play ${pack.name}`}>
                                   <Play className="w-4 h-4 text-white" />
                                </button>
                                <button type="button" onClick={(e) => { e.stopPropagation(); addManyToQueue(pack.trackIds); }} className="p-2 bg-gray-900 border border-gray-700 rounded hover:border-neo-lime transition-colors" aria-label={`Add ${pack.name} to queue`}>
                                   <ListPlus className="w-4 h-4 text-neo-lime" />
                                </button>
                             </div>
                          </div>
                       )});
                    }

                    if (view === 'playlists') {
                       return (
                          <div className="flex flex-col gap-4 h-full">
                             {creatingPlaylist ? (
                                <div className="flex gap-2">
                                   <input value={newPlaylistName} onChange={e => setNewPlaylistName(e.target.value)} placeholder="PLAYLIST NAME" className="flex-1 bg-black border border-neo-yellow/30 p-2 text-sm text-neo-yellow focus:outline-none focus:border-neo-yellow" />
                                   <button onClick={handleCreatePlaylist} className="px-4 py-2 bg-neo-yellow text-black font-bold text-xs uppercase tracking-widest">Create</button>
                                   <button onClick={() => setCreatingPlaylist(false)} className="px-3 py-2 bg-gray-800 text-white font-bold text-xs uppercase tracking-widest flex items-center justify-center"><X className="w-4 h-4" /></button>
                                </div>
                             ) : (
                                <button onClick={() => setCreatingPlaylist(true)} className="flex items-center gap-2 justify-center w-full py-3 mb-2 border-2 border-dashed border-neo-yellow/30 text-neo-yellow hover:bg-neo-yellow/10 transition-colors uppercase tracking-widest text-xs font-bold font-mono">
                                   <Plus className="w-4 h-4" /> CREATE NEW PLAYLIST
                                </button>
                             )}
                             
                             {playlists.length === 0 ? (
                                <div className="text-center flex flex-col items-center justify-center flex-1 text-neo-yellow/50 font-mono tracking-widest text-lg border-2 border-dashed border-neo-yellow/20 rounded-xl bg-black/40 p-8 min-h-[200px]">
                                   <Folder className="w-12 h-12 mb-4 opacity-50" />
                                   NO PLAYLISTS CONFIGURED.
                                </div>
                             ) : (
                                filteredPlaylists.map((pl) => {
                                  const coverTrack = pl.trackIds.map(id => tracks.find(t => t.id === id)).find(Boolean) as Track | undefined;
                                  return (
                                   <div key={pl.id} 
                                      className="flex items-center gap-4 group mb-2 border border-neo-yellow/30 bg-[#060608] hover:bg-neo-yellow/10 p-4 rounded-lg transition-colors cursor-pointer"
                                      onClick={() => { setSelectedId(pl.id); setView('playlist_tracks'); }}
                                   >
                                      {coverTrack ? <CoverArt track={coverTrack} size="md" /> : <div className="w-12 h-12 rounded border border-neo-yellow text-neo-yellow flex items-center justify-center bg-black">
                                         <Folder className="w-6 h-6 drop-shadow-[0_0_5px_currentColor]" />
                                      </div>}
                                      <div className="flex-1">
                                         <h3 className="text-lg font-bold tracking-widest text-white italic uppercase drop-shadow-[0_0_5px_currentColor]">
                                            {pl.name}
                                         </h3>
                                         <p className="text-xs font-mono tracking-widest text-neo-yellow mt-1 uppercase">{pl.trackIds.length} TRACKS</p>
                                      </div>
                                   </div>
                                )})
                             )}
                          </div>
                       );
                    }

                    if (displayedTracks.length === 0) {
                       let Emptymessage = "VAULT EMPTY.";
                       let Icon = Activity;
                       let colorClass = "text-neo-cyan/50";
                       let borderClass = "border-neo-cyan/20";
                       
                       if (search) Emptymessage = "NO MATCHES IN CURRENT VAULT.";
                       else if (view === 'downloaded') { Emptymessage = "NO DOWNLOADED TRACKS."; Icon = Download; colorClass = "text-neo-magenta/50"; borderClass = "border-neo-magenta/20"; }
                       else if (view === 'recently_added') { Emptymessage = "NO RECENT TRACKS."; Icon = Clock; colorClass = "text-neo-cyan/50"; borderClass = "border-neo-cyan/20"; }
                       else if (view === 'lossless') { Emptymessage = "NO HIGH-FIDELITY TRACKS."; Icon = Activity; colorClass = "text-blue-500/50"; borderClass = "border-blue-500/20"; }
                       else if (view === 'mood_tracks' || view === 'smart_tracks') { Emptymessage = "NO SIGNALS MATCH THIS PACK"; Icon = Smile; colorClass = "text-neo-lime/50"; borderClass = "border-neo-lime/20"; }
                       else if (view === 'playlist_tracks') { Emptymessage = "PLAYLIST IS EMPTY."; Icon = Music; colorClass = "text-neo-yellow/50"; borderClass = "border-neo-yellow/20"; }

                       return (
                          <div className={cn("text-center flex flex-col items-center justify-center h-full font-mono tracking-widest text-lg border-2 border-dashed rounded-xl bg-black/40 p-8", colorClass, borderClass)}>
                             <Icon className="w-12 h-12 mb-4 opacity-50" />
                             {Emptymessage}
                          </div>
                       );
                    }

                    return displayedTracks.map((track) => {
                       const isCurrent = currentTrackId === track.id;
                       return (
                          <div key={track.id} className="flex flex-col md:flex-row gap-4 w-full items-center group mb-2 border border-gray-800 bg-[#060608] hover:bg-[#0a0a0f] p-3 rounded-lg transition-colors">
                             <div className={cn(
                                "flex-1 w-full relative flex items-center gap-4"
                             )}>
                                <CoverArt track={track} size="md" active={isCurrent && isPlaying} />
                                <div className="flex-1">
                                   <h3 onClick={() => navigate(`/track/${track.id}`)} className="text-sm font-bold tracking-widest text-white italic truncate uppercase drop-shadow-[0_0_5px_currentColor] max-w-[200px] sm:max-w-sm cursor-pointer hover:text-neo-cyan">
                                      {track.title}
                                   </h3>
                                   <p className="text-[10px] font-mono tracking-widest text-gray-400 mt-1 uppercase whitespace-nowrap">
                                      {formatBytes(track.size)} • {formatDuration(track.duration)}
                                   </p>
                                </div>
                                <div className="flex gap-2 shrink-0">
                                   <button onClick={() => playTrack(track.id, displayedTracks.map(t => t.id))} className="p-2 bg-gray-900 border border-gray-700 rounded hover:border-neo-cyan transition-colors">
                                      <Play className={cn("w-4 h-4", isCurrent && isPlaying ? "text-neo-lime" : "text-white")} />
                                   </button>
                                   <button
                                      type="button"
                                      aria-label={`Add ${track.title} to queue`}
                                      title="Add to Queue"
                                      onClick={(e) => { e.stopPropagation(); addToQueue(track.id); }}
                                      className="p-2 bg-gray-900 border border-gray-700 rounded hover:border-neo-lime transition-colors"
                                   >
                                      <ListPlus className="w-4 h-4 text-gray-400 group-hover:text-neo-lime hover:text-neo-lime" />
                                   </button>
                                   <button onClick={(e) => { e.stopPropagation(); navigate(`/track/${track.id}`); }} className="p-2 bg-gray-900 border border-gray-700 rounded hover:border-neo-cyan transition-colors" aria-label="Track details">
                                      <Folder className="w-4 h-4 text-gray-400 group-hover:text-neo-cyan hover:text-neo-cyan" />
                                   </button>
                                   <button onClick={(e) => { e.stopPropagation(); setAddingToPlaylistTrack(track.id === addingToPlaylistTrack ? null : track.id); }} className="p-2 bg-gray-900 border border-gray-700 rounded hover:border-neo-magenta transition-colors">
                                      <Plus className="w-4 h-4 text-gray-400 group-hover:text-neo-magenta hover:text-neo-magenta" />
                                   </button>
                                   <button onClick={(e) => { e.stopPropagation(); setLabTrackId(track.id); }} className="p-2 bg-gray-900 border border-gray-700 rounded hover:border-neo-yellow transition-colors" aria-label="Metadata lab">
                                      <EditIcon className="w-4 h-4 text-gray-400 group-hover:text-neo-yellow hover:text-neo-yellow" />
                                   </button>
                                   {view === 'playlist_tracks' && selectedId ? (
                                      <button onClick={(e) => { 
                                         e.stopPropagation(); 
                                         const pl = playlists.find(p => p.id === selectedId);
                                         if (pl) updatePlaylist(pl.id, { trackIds: pl.trackIds.filter(id => id !== track.id) });
                                      }} className="p-2 bg-gray-900 border border-gray-700 rounded hover:border-neo-red hover:text-neo-red transition-colors">
                                         <X className="w-4 h-4 text-gray-400 group-hover:text-neo-red" />
                                      </button>
                                   ) : (
                                      <button onClick={(e) => { e.stopPropagation(); removeTrack(track.id); }} className="p-2 bg-gray-900 border border-gray-700 rounded hover:border-neo-red hover:text-neo-red transition-colors">
                                         <Trash2 className="w-4 h-4 text-gray-400 group-hover:text-neo-red" />
                                      </button>
                                   )}
                                </div>
                             </div>
                             {addingToPlaylistTrack === track.id && (
                                <div className="w-full mt-2 p-3 bg-[#050508] border border-neo-magenta/30 rounded flex flex-col gap-2">
                                   <span className="text-xs text-neo-magenta tracking-widest font-bold">ADD TO PLAYLIST:</span>
                                   {playlists.length === 0 ? <span className="text-xs text-gray-500 font-mono">NO PLAYLISTS AVAILABLE.</span> : playlists.map(pl => (
                                      <button key={pl.id} onClick={() => {
                                          updatePlaylist(pl.id, { trackIds: Array.from(new Set([...pl.trackIds, track.id])) });
                                          setAddingToPlaylistTrack(null);
                                      }} className="text-left text-xs bg-black border border-gray-800 p-2 text-white hover:bg-gray-800 tracking-widest uppercase font-bold text-neo-yellow">
                                         {pl.name}
                                      </button>
                                   ))}
                                   <button onClick={() => setAddingToPlaylistTrack(null)} className="px-3 py-1 bg-gray-800 text-[10px] text-white self-end mt-2 tracking-widest">CANCEL</button>
                                </div>
                             )}
                             {editingTrack === track.id && (
                                <div className="w-full mt-2 p-3 bg-[#050508] border border-neo-yellow/30 rounded flex flex-col gap-2">
                                   <div className="flex gap-2">
                                     <input value={editTitle} onChange={e => setEditTitle(e.target.value)} placeholder="Title" className="flex-1 bg-black border border-gray-700 p-1.5 text-xs text-white" />
                                     <input value={editArtist} onChange={e => setEditArtist(e.target.value)} placeholder="Artist" className="flex-1 bg-black border border-gray-700 p-1.5 text-xs text-white" />
                                     <input value={editGenre} onChange={e => setEditGenre(e.target.value)} placeholder="Genre" className="flex-1 bg-black border border-gray-700 p-1.5 text-xs text-white" />
                                   </div>
                                   <div className="flex justify-end gap-2">
                                      <button onClick={() => setEditingTrack(null)} className="px-3 py-1 bg-gray-800 text-[10px] text-white">CANCEL</button>
                                      <button onClick={() => saveEdit(track)} className="px-3 py-1 bg-neo-yellow text-[10px] text-black font-bold">SAVE</button>
                                   </div>
                                </div>
                             )}
                          </div>
                       )
                    })
                 })()}
              </div>
           </div>
         )}
      </div>

      {/* Vault Status Footer */}
      <div className="w-full max-w-4xl mt-6 cyber-panel p-3 px-6 flex justify-between items-center z-20">
         <div className="flex flex-col">
            <span className="text-[10px] font-mono tracking-widest text-neo-cyan mb-1">VAULT STATUS</span>
            <div className="flex items-center text-xs font-bold tracking-widest text-neo-lime">
               <Shield className="w-3 h-3 mr-1" /> SECURE • LOCAL STORAGE ACTIVE
            </div>
         </div>
         <div className="flex items-center gap-4">
            <div className="flex flex-col items-end">
               <span className="text-[10px] font-mono tracking-widest text-gray-400 mb-1">STORAGE</span>
               <span className="text-xs font-mono text-white">{formatBytes(totalBytes)} / {formatBytes(TOTAL_CAPACITY)}</span>
            </div>
            {/* Circular Progress */}
            <div className="w-10 h-10 rounded-full border-2 border-neo-lime/30 flex items-center justify-center relative bg-black">
               <svg viewBox="0 0 36 36" className="absolute inset-0 w-full h-full -rotate-90">
                 <path
                   className="text-neo-lime"
                   strokeDasharray={`${storagePercent}, 100`}
                   strokeWidth="3"
                   strokeLinecap="round"
                   stroke="currentColor"
                   fill="none"
                   d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                   style={{ filter: 'drop-shadow(0 0 3px currentColor)' }}
                 />
               </svg>
               <span className="text-[10px] font-bold text-neo-lime z-10">{storagePercent}%</span>
            </div>
         </div>
      </div>
      {labTrackId && (() => { const lt = tracks.find(t => t.id === labTrackId); return lt ? <MetadataLab track={lt} open={!!labTrackId} onClose={() => setLabTrackId(null)} onSave={(patch) => useLibraryStore.getState().updateTrack(lt.id, patch)} /> : null; })()}
    </div>
  );
}
