import { useState } from 'react';
import { Play, Pause, SkipForward, Music, ListMusic } from 'lucide-react';
import { usePlayerStore } from '../../store/usePlayerStore';
import { useLibraryStore } from '../../store/useLibraryStore';
import { useNavigate, useLocation } from 'react-router-dom';
import { NeonProgressBar } from '../ui/NeonProgressBar';
import { QueuePanel } from './QueuePanel';

export function MiniPlayer() {
  const { currentTrackId, isPlaying, pause, resume, next, progress, queue, queueIndex } = usePlayerStore();
  const tracks = useLibraryStore(state => state.tracks);
  const navigate = useNavigate();
  const location = useLocation();
  const [queueOpen, setQueueOpen] = useState(false);

  if (!currentTrackId || location.pathname === '/player') return null;

  const track = tracks.find(t => t.id === currentTrackId);
  const currentIndex = queue.indexOf(currentTrackId);
  const activeQueueIndex = currentIndex !== -1 ? currentIndex : queueIndex;
  const queueCount = Math.max(0, queue.length - activeQueueIndex - 1);

  return (
    <div className="fixed bottom-16 left-0 z-40 w-full border-t border-gray-800 bg-neo-surface glass-panel md:bottom-0 md:left-64 md:w-[calc(100%-16rem)]">
      <NeonProgressBar progress={progress * 100} color="magenta" className="absulote top-0 left-0 h-1" />
      <div className="flex h-16 items-center justify-between px-4">
        <div 
          className="flex cursor-pointer items-center space-x-3 overflow-hidden"
          onClick={() => navigate('/player')}
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded bg-gray-800">
            {track?.coverArt ? (
              <img src={track.coverArt} alt="Cover" className="h-full w-full object-cover" />
            ) : (
              <Music className="text-gray-400" />
            )}
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="truncate text-sm font-medium text-white">{track?.title || 'Unknown Track'}</span>
            <span className="truncate text-xs text-gray-400">{track?.artist || 'Unknown Artist'}</span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => setQueueOpen(true)}
            className="relative flex h-10 w-10 items-center justify-center rounded-full text-white hover:bg-gray-800 hover:text-neo-cyan"
            aria-label="Open queue"
          >
            <ListMusic className="h-5 w-5" />
            {queueCount > 0 && (
              <span className="absolute -right-1 -top-1 flex min-w-5 items-center justify-center rounded-full border border-neo-cyan bg-black px-1 font-mono text-[10px] text-neo-cyan">
                {queueCount}
              </span>
            )}
          </button>
          <button 
            onClick={isPlaying ? pause : resume} 
            className="flex h-10 w-10 items-center justify-center rounded-full text-white hover:bg-gray-800 hover:text-neo-cyan"
          >
            {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-1" />}
          </button>
          <button 
            onClick={next}
            className="flex h-10 w-10 items-center justify-center rounded-full text-white hover:bg-gray-800 hover:text-neo-cyan"
          >
            <SkipForward className="h-5 w-5" />
          </button>
        </div>
      </div>
      <QueuePanel mode="drawer" open={queueOpen} onClose={() => setQueueOpen(false)} />
    </div>
  );
}
