import { useEffect, useState } from 'react';
import { useDownloadStore } from '../store/useDownloadStore';
import { AlertCircle, Bot, ChevronDown, ChevronRight, DownloadCloud, Play, Terminal } from 'lucide-react';
import { cn } from '../lib/utils';
import toast from 'react-hot-toast';
import { usePlayerStore } from '../store/usePlayerStore';
import { useAppStore } from '../store/useAppStore';
import { useLibraryStore } from '../store/useLibraryStore';
import { SUPPORTED_FORMATS, type DownloadJob } from '../types';
import { useNavigate } from 'react-router-dom';
import { NeoAudioHeader } from '../components/layout/NeoAudioHeader';

export function Downloader() {
  const navigate = useNavigate();
  const settings = useAppStore(state => state.settings);
  const [url, setUrl] = useState('');
  const [format, setFormat] = useState(settings.defaultFormat || 'mp3');
  const [bitrate, setBitrate] = useState(settings.defaultBitrate || 320);
  
  const { jobs, loadJobs, addJob, startJob, retryJob, removeJob, cancelJob, beginPolling, endPolling } = useDownloadStore();
  const playTrack = usePlayerStore(state => state.playTrack);
  const [expandedLogs, setExpandedLogs] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadJobs();
    beginPolling();
    return () => {
      endPolling();
    };
  }, [loadJobs, beginPolling, endPolling]);

  const isValidHttpUrl = (s: string): boolean => {
    try {
      const u = new URL(s);
      return u.protocol === 'http:' || u.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const handleAdd = async () => {
    if (!isValidHttpUrl(url)) {
      toast.error('Please enter a valid http or https URL for a permitted source');
      return;
    }

    const normalizedUrl = url.trim().toLowerCase();
    const duplicate = jobs.find((job) => {
      const existingUrl = (job.sourceUrl || '').trim().toLowerCase();
      return existingUrl === normalizedUrl && job.status !== 'failed' && job.status !== 'cancelled';
    });

    if (duplicate) {
      const proceed = typeof window !== 'undefined'
        ? window.confirm(`This URL is already in the queue as ${duplicate.status.toUpperCase()}. Add another job anyway?`)
        : true;
      if (!proceed) {
        toast(`Skipped duplicate (${duplicate.status.toUpperCase()}).`);
        return;
      }
    }

    const newJob = await addJob(url, format, bitrate);
    if (newJob) {
      await startJob(newJob.id);
    }
    setUrl('');
  };

  const toggleLogs = (id: string) => {
    setExpandedLogs(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handlePlay = async (job: DownloadJob) => {
    if (!job.resultTrackId) return;
    const lib = useLibraryStore.getState();
    if (!lib.tracks.find(t => t.id === job.resultTrackId)) {
      await lib.loadLibrary();
    }
    const queueIds = jobs
      .filter(j => j.status === 'complete' && j.resultTrackId)
      .map(j => j.resultTrackId!) as string[];
    playTrack(job.resultTrackId, queueIds);
  };

  const phaseLabel = (phase: string, status: string) => {
    if (status === 'complete') return 'complete';
    const normalized = (phase || status || 'queued').toLowerCase();
    if (normalized.includes('queue')) return 'queued';
    if (normalized.includes('analy')) return 'analyzing';
    if (normalized.includes('download')) return 'downloading';
    if (normalized.includes('convert') || normalized.includes('transcod')) return 'converting';
    if (normalized.includes('verif') || normalized.includes('index')) return 'verifying';
    return normalized;
  };

  return (
    <div className="max-w-6xl mx-auto min-h-[calc(100vh-140px)] flex flex-col justify-center pb-24 md:pb-0 px-4">
      {/* Circuit board background lines faint - implemented via CSS radial/linear in index already, but add faint overlay here */}
      <div className="absolute inset-0 pointer-events-none opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(0, 240, 255, 0.1) 0%, transparent 60%)' }} />

      <NeoAudioHeader className="mb-6 relative z-10" alt="N.E.O Audio Lab downloader" />

      <div className="relative flex flex-col items-center justify-center mb-8">
         <h1 className="text-3xl md:text-5xl font-bold tracking-[0.3em] font-mono uppercase bg-clip-text text-transparent bg-gradient-to-r from-neo-cyan via-white to-neo-magenta drop-shadow-[0_0_10px_currentColor]">DOWNLOADER MODULE</h1>
         <div className="flex items-center gap-2 mt-4 text-xs tracking-widest text-neo-cyan font-mono opacity-80 uppercase border-b border-neo-cyan/30 pb-2">
            <DownloadCloud className="w-4 h-4" />
            <span>N.E.O. File Acquisition Engine</span>
         </div>
      </div>

      <div className="relative flex flex-col lg:flex-row items-center lg:items-stretch justify-between w-full z-10 gap-12">
        
        {/* Left Side: Bot Character */}
        <div className="flex-1 flex flex-col items-center justify-center">
            <div className="relative w-48 h-64 flex flex-col items-center">
               <Bot className="w-32 h-32 text-gray-800 fill-black drop-shadow-[0_0_15px_rgba(0,240,255,0.5)] z-10 relative mt-4" />
               <div className="absolute top-12 left-1/2 -translate-x-1/2 flex gap-4">
                  <div className="w-3 h-2 bg-neo-cyan rounded-full animate-pulse blur-[1px]" />
                  <div className="w-3 h-2 bg-neo-magenta rounded-full animate-pulse blur-[1px]" />
               </div>
               <div className="absolute top-28 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full border border-neo-lime/50 opacity-50 shadow-[0_0_10px_#39ff14_inset]" />
               
               {/* Pedestal Base */}
               <div className="mt-auto w-40 h-16 relative">
                 <div className="absolute bottom-0 w-full h-8 bg-[#111] rounded-[50%] border-b-4 border-[#333] shadow-[0_0_20px_#000]" />
                 <div className="absolute bottom-2 w-full h-8 bg-gradient-to-r from-neo-blue via-neo-cyan to-neo-blue rounded-[50%] opacity-20 blur-md animate-pulse" />
                 <div className="absolute bottom-4 w-full h-8 bg-black rounded-[50%] border-2 border-neo-magenta shadow-[0_0_15px_rgba(255,0,255,0.4)_inset] flex flex-col items-center justify-center overflow-hidden">
                    <span className="text-[10px] font-bold text-neo-cyan tracking-widest uppercase italic">N.E.O</span>
                 </div>
               </div>
            </div>
        </div>

        {/* Center: Input Panel */}
        <div className="flex-[1.5] w-full flex justify-center">
          <div className="w-full max-w-md flex flex-col items-center gap-6">
            <div className="w-full relative shadow-[0_0_15px_rgba(0,240,255,0.2)] rounded-lg">
              {/* Outer bevel frame */}
              <div className="absolute inset-0 bg-transparent border-2 border-[#1a1a24] rounded-lg transform scale-105 pointer-events-none" />
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="ENTER HTTP/HTTPS URL"
                className={cn(
                  "w-full h-16 bg-[#0a0a0f] border-2 text-center text-xl sm:text-2xl font-bold tracking-widest text-white placeholder:text-gray-600 rounded-lg focus:outline-none transition-colors",
                  url && !isValidHttpUrl(url) ? "border-neo-magenta shadow-[0_0_15px_rgba(255,0,255,0.4)]" : "border-neo-cyan focus:border-white"
                )}
              />
              {url && !isValidHttpUrl(url) && (
                 <div className="absolute -bottom-6 flex items-center justify-center w-full text-neo-magenta text-[10px] uppercase tracking-widest font-bold">
                    <AlertCircle className="w-3 h-3 mr-1" /> Invalid URL Format
                 </div>
              )}
            </div>
            
            <div className="w-full flex gap-4 mt-2">
              <div className="flex-1 flex flex-col">
                <label className="text-[10px] font-bold text-neo-cyan tracking-widest uppercase mb-1 flex items-center justify-between">
                  <span>FORMAT</span>
                  <span className="text-gray-500">[{format.toUpperCase()}]</span>
                </label>
                <div className="grid grid-cols-3 gap-1">
                  {SUPPORTED_FORMATS.map((f) => (
                    <button
                      key={f}
                      onClick={() => setFormat(f)}
                      className={cn(
                        "py-2 text-xs font-mono font-bold rounded border transition-all uppercase",
                        format === f 
                          ? "bg-neo-cyan/20 border-neo-cyan text-neo-cyan shadow-[0_0_10px_rgba(0,240,255,0.3)]" 
                          : "bg-black border-gray-800 text-gray-500 hover:border-gray-600"
                      )}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex-1 flex flex-col">
                <label className="text-[10px] font-bold text-neo-cyan tracking-widest uppercase mb-1 flex items-center justify-between">
                  <span>BITRATE</span>
                  <span className="text-gray-500">[{bitrate}K]</span>
                </label>
                <div className="grid grid-cols-4 gap-1">
                   {[128, 192, 256, 320].map((b) => (
                    <button
                      key={b}
                      onClick={() => setBitrate(b)}
                      className={cn(
                        "py-2 text-[10px] font-mono font-bold rounded border transition-all",
                        bitrate === b 
                          ? "bg-neo-cyan/20 border-neo-cyan text-neo-cyan shadow-[0_0_10px_rgba(0,240,255,0.3)]" 
                          : "bg-black border-gray-800 text-gray-500 hover:border-gray-600"
                      )}
                    >
                      {b}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="w-full mt-2 text-[10px] sm:text-xs text-red-500/80 text-center uppercase tracking-tight leading-loose px-2 border border-dashed border-red-500/50 rounded p-2 bg-[#050508] shadow-[inset_0_0_10px_rgba(0,0,0,0.8)]">
               <span className="text-neo-magenta font-bold flex items-center justify-center gap-1 mb-1">
                 <AlertCircle className="w-3 h-3" /> CRITICAL COMPLIANCE RULE
               </span>
               Use this module strictly for audio that you legitimately own or have explicit legal permission to download (e.g. Public Domain, Creative Commons). Do not use this tool for copyright infringement.
            </div>

            <button 
               onClick={handleAdd}
               className="btn-lime w-full py-4 rounded-lg font-bold tracking-widest text-lg sm:text-xl uppercase transition-transform hover:scale-[1.02] active:scale-95 mt-2 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(57,255,20,0.3)]"
            >
              <DownloadCloud className="w-6 h-6" /> ADD & START
            </button>
          </div>
        </div>

        {/* Right Side: File List Panel */}
        <div className="flex-1 w-full max-w-full lg:max-w-sm mt-12 lg:mt-0 flex flex-col h-full lg:h-[450px]">
          <div className="text-[10px] font-bold text-neo-magenta tracking-widest uppercase mb-2 ml-1">ACQUISITION QUEUE</div>
          <div className="armored-frame p-2 flex-1 flex flex-col relative w-full border-neo-magenta shadow-[0_0_20px_rgba(255,0,255,0.2)]">
             <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-white" />
             <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-white" />

             {/* Inner screen */}
             <div className="flex-1 bg-black/80 rounded-lg p-3 overflow-y-auto space-y-4 font-mono">
                {jobs.length === 0 && (
                   <div className="text-gray-600 text-sm italic tracking-wide h-full flex flex-col items-center justify-center gap-2">
                     <DownloadCloud className="w-8 h-8 opacity-20" />
                     <span>* No active operations</span>
                   </div>
                )}
                {jobs.map((job) => (
                  <div key={job.id} className="relative group border border-gray-800 bg-[#05050a] p-2 rounded flex flex-col gap-2 transition-colors hover:border-gray-700">
                    <div className="flex justify-between items-start text-[11px]">
                      <span className="text-white font-bold truncate pr-2 max-w-[70%]">{job.sourceUrl}</span>
                      <span className={cn(
                          "text-[9px] uppercase px-1.5 py-0.5 rounded font-bold border",
                          job.status === 'complete' ? "text-neo-lime border-neo-lime/30 bg-neo-lime/10" : 
                          job.status === 'failed' ? "text-neo-magenta border-neo-magenta/30 bg-neo-magenta/10" : 
                          job.status === 'cancelled' ? "text-gray-400 border-gray-600/50 bg-gray-800" :
                          "text-neo-cyan border-neo-cyan/30 bg-neo-cyan/10 animate-pulse"
                      )}>
                          {job.status}
                      </span>
                    </div>
                    
                    <div className="flex justify-between text-[9px] text-gray-500 uppercase tracking-widest font-bold">
                        <span>{job.format} / {job.actualBitrate || job.bitrate}kbps</span>
                        <span className="text-gray-400 max-w-[50%] truncate text-right">{phaseLabel(job.phase, job.status)}</span>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-black border border-gray-800 rounded-full overflow-hidden relative">
                           <div
                             className={cn(
                               "h-full transition-all duration-300 shadow-[0_0_5px_currentColor]",
                               job.status === 'complete' ? "bg-neo-lime text-neo-lime" : job.status === 'failed' ? "bg-red-500 text-red-500" : job.status === 'cancelled' ? "bg-gray-700 text-gray-700" : "bg-neo-cyan text-neo-cyan"
                             )}
                             style={{ width: `${job.progress > 0 ? job.progress : 5}%` }}
                           />
                        </div>
                        <span className="text-[9px] font-bold min-w-[28px] text-right text-gray-400">{Math.round(job.progress)}%</span>
                    </div>

                    {(job.speed || job.eta) && (job.status === 'downloading' || job.status === 'converting' || job.status === 'analyzing') && (
                      <div className="flex justify-between text-[9px] text-neo-cyan/80 uppercase tracking-widest font-bold">
                        {job.speed ? <span>SPD {job.speed}</span> : <span />}
                        {job.eta ? <span>ETA {job.eta}</span> : <span />}
                      </div>
                    )}

                    {job.error && (
                      <div className="text-[9px] text-red-400 mt-1 italic tracking-tight leading-tight bg-red-500/10 p-1.5 rounded border border-red-500/20">
                        <span className="font-bold block mb-1 break-words">
                          {job.errorCode ? `[${job.errorCode}] ` : ''}{job.error}
                        </span>
                      </div>
                    )}

                    {(job.status === 'failed' || job.status === 'cancelled') && job.logs && job.logs.length > 0 && (
                      <div className="mt-1">
                        <button
                          onClick={() => toggleLogs(job.id)}
                          className="flex items-center gap-1 text-[9px] uppercase tracking-widest font-bold text-neo-cyan/80 hover:text-neo-cyan transition-colors"
                        >
                          {expandedLogs[job.id] ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                          <Terminal className="w-3 h-3" />
                          <span>{expandedLogs[job.id] ? 'HIDE LOGS' : 'SHOW LOGS'}</span>
                          <span className="text-gray-500 normal-case">({job.logs.length})</span>
                        </button>
                        {expandedLogs[job.id] && (
                          <div className="mt-1 text-[9px] font-mono text-gray-400 bg-black/80 border border-neo-cyan/20 rounded p-1.5 max-h-40 overflow-y-auto leading-snug whitespace-pre-wrap break-words">
                            {job.logs.slice(-20).map((l, i) => <div key={i}>{l}</div>)}
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Actions */}
                    <div className="flex flex-wrap justify-end gap-1.5 mt-1 pt-1 border-t border-gray-800/50">
                       {job.status === 'queued' && (
                         <>
                           <button onClick={() => startJob(job.id)} className="text-[9px] text-neo-lime border border-neo-lime/50 px-2 py-1 rounded hover:bg-neo-lime/20 transition-colors uppercase font-bold tracking-wide">START</button>
                           <button onClick={() => cancelJob(job.id)} className="text-[9px] text-neo-magenta border border-neo-magenta/50 px-2 py-1 rounded hover:bg-neo-magenta/20 transition-colors uppercase font-bold tracking-wide">CANCEL</button>
                           <button onClick={() => removeJob(job.id)} className="text-[9px] text-red-500 border border-red-500/50 px-2 py-1 rounded hover:bg-red-500/20 transition-colors uppercase font-bold tracking-wide">REMOVE</button>
                         </>
                       )}
                       {(job.status === 'failed' || job.status === 'cancelled') && (
                         <>
                           <button onClick={() => retryJob(job.id)} className="text-[9px] text-neo-orange border border-neo-orange/50 px-2 py-1 rounded hover:bg-neo-orange/20 transition-colors uppercase font-bold tracking-wide">RETRY</button>
                           <button onClick={() => removeJob(job.id)} className="text-[9px] text-red-500 border border-red-500/50 px-2 py-1 rounded hover:bg-red-500/20 transition-colors uppercase font-bold tracking-wide">REMOVE</button>
                         </>
                       )}
                       {(job.status === 'downloading' || job.status === 'analyzing' || job.status === 'converting' || job.status === 'indexing') && (
                         <button onClick={() => cancelJob(job.id)} className="text-[9px] text-neo-magenta border border-neo-magenta/50 px-2 py-1 rounded hover:bg-neo-magenta/20 transition-colors uppercase font-bold tracking-wide">CANCEL</button>
                       )}
                       {job.status === 'complete' && (
                         <>
                          {job.resultTrackId && (
                             <button onClick={() => handlePlay(job)} className="text-[9px] text-black bg-neo-cyan px-2 py-1 rounded hover:bg-white transition-colors uppercase font-bold tracking-wide flex items-center gap-1">
                               <Play className="w-3 h-3" /> PLAY
                             </button>
                           )}
                           <button
                             onClick={() => navigate(`/library?trackId=${encodeURIComponent(job.resultTrackId || '')}&q=${encodeURIComponent(job.metadata?.title || '')}`)}
                             className="text-[9px] text-neo-lime border border-neo-lime/50 px-2 py-1 rounded hover:bg-neo-lime/20 transition-colors uppercase font-bold tracking-wide"
                           >
                             OPEN LIBRARY
                           </button>
                           <button onClick={() => removeJob(job.id)} className="text-[9px] text-red-500 border border-red-500/50 px-2 py-1 rounded hover:bg-red-500/20 transition-colors uppercase font-bold tracking-wide">REMOVE</button>
                         </>
                       )}
                    </div>
                  </div>
                ))}
             </div>
          </div>
        </div>

      </div>
    </div>
  );
}
