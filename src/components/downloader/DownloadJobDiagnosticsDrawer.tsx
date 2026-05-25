import { useMemo, useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronRight, Terminal } from 'lucide-react';
import { DownloadJob } from '../../types';
import { cn } from '../../lib/utils';

interface Props {
  job: DownloadJob;
  expanded: boolean;
  onToggle: () => void;
  onRetry?: () => void;
  onCancel?: () => void;
  onRemove?: () => void;
  onPlay?: () => void;
  onOpenLibrary?: () => void;
}

const fmtTime = (v?: number) => (v ? new Date(v).toLocaleString() : '—');
const shortId = (id: string) => `${id.slice(0, 8)}…${id.slice(-4)}`;

export function DownloadJobDiagnosticsDrawer({ job, expanded, onToggle, onRetry, onCancel, onRemove, onPlay, onOpenLibrary }: Props) {
  const [showLogs, setShowLogs] = useState(false);
  const logs = job.logs || [];
  const visibleLogs = logs.slice(-20);
  const hiddenCount = Math.max(0, logs.length - visibleLogs.length);
  const isTerminal = ['complete', 'failed', 'cancelled'].includes(job.status);

  const sourceHost = useMemo(() => {
    if (job.sourceHostname) return job.sourceHostname;
    try { return new URL(job.sourceUrl).hostname; } catch { return 'unknown'; }
  }, [job.sourceHostname, job.sourceUrl]);

  return (
    <div className="border border-neo-cyan/20 rounded bg-black/60">
      <button onClick={onToggle} className="w-full flex items-center justify-between px-2 py-1.5 text-[10px] tracking-widest uppercase text-neo-cyan font-bold">
        <span className="flex items-center gap-2">{expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />} Diagnostics</span>
        <span>{expanded ? 'Hide' : 'Show'} Details</span>
      </button>
      {expanded && (
        <div className="px-2 pb-2 text-[10px] space-y-2">
          <div className="grid grid-cols-2 gap-2 border border-gray-800 rounded p-2 bg-[#04040a]">
            <div>Job: <span className="text-white">{shortId(job.id)}</span></div>
            <div>Status: <span className="text-neo-cyan">{job.status}</span></div>
            <div>Phase: <span className="text-gray-200">{job.phase || '—'}</span></div>
            <div>Progress: <span className="text-gray-200">{Math.round(job.progress)}%</span></div>
            {job.error && <div className="col-span-2 text-red-400">Error: {job.errorCode ? `[${job.errorCode}] ` : ''}{job.error}</div>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="border border-gray-800 rounded p-2 bg-[#04040a]">
              <div className="text-neo-magenta uppercase mb-1">Source</div>
              <div className="break-all">URL: {job.sourceUrl}</div>
              <div>Host: {sourceHost}</div>
              <div>Format: {job.format}</div>
              <div>Requested bitrate: {job.bitrate} kbps</div>
              <div>Created: {fmtTime(job.createdAt)}</div>
              <div>Started: {fmtTime(job.startedAt)}</div>
              <div>Completed: {fmtTime(job.completedAt)}</div>
            </div>

            <div className="border border-gray-800 rounded p-2 bg-[#04040a]">
              <div className="text-neo-magenta uppercase mb-1">Runtime</div>
              <div>Progress: {Math.round(job.progress)}%</div>
              <div>Speed: {job.speed || '—'}</div>
              <div>ETA: {job.eta || '—'}</div>
              <div>Phase: {job.phase || '—'}</div>
              <div>State: {isTerminal ? 'terminal' : 'active'}</div>
            </div>

            <div className="border border-gray-800 rounded p-2 bg-[#04040a]">
              <div className="text-neo-magenta uppercase mb-1">Output</div>
              <div>Track ID: {job.resultTrackId || '—'}</div>
              <div>Filename: {job.outputFilename || '—'}</div>
              <div>Actual bitrate: {job.actualBitrate ? `${job.actualBitrate} kbps` : '—'}</div>
              <div>Duration: {job.actualDuration ? `${Math.round(job.actualDuration)} sec` : '—'}</div>
              <div>File size: {job.fileSize ? `${Math.round(job.fileSize / 1024)} KB` : '—'}</div>
              {job.status === 'complete' && (
                <div className="flex flex-wrap gap-1 mt-2">
                  <button onClick={onPlay} className="text-black bg-neo-cyan px-2 py-1 rounded">Play</button>
                  <button onClick={onOpenLibrary} className="text-neo-lime border border-neo-lime/50 px-2 py-1 rounded">Open Library</button>
                </div>
              )}
            </div>

            <div className="border border-gray-800 rounded p-2 bg-[#04040a]">
              <div className="text-neo-magenta uppercase mb-1">Error</div>
              <div>Code: {job.errorCode || '—'}</div>
              <div className="break-words">Message: {job.error || '—'}</div>
              <div>Last failure phase: {job.status === 'failed' ? job.phase : '—'}</div>
              <div className="flex flex-wrap gap-1 mt-2">
                {onRetry && <button onClick={onRetry} className="text-neo-orange border border-neo-orange/50 px-2 py-1 rounded">Retry</button>}
                {onCancel && <button onClick={onCancel} className="text-neo-magenta border border-neo-magenta/50 px-2 py-1 rounded">Cancel</button>}
                {onRemove && <button onClick={onRemove} className="text-red-500 border border-red-500/50 px-2 py-1 rounded">Remove</button>}
              </div>
            </div>
          </div>

          <div className="border border-neo-cyan/20 rounded p-2 bg-black/80">
            <button onClick={() => setShowLogs(v => !v)} className="flex items-center gap-1 uppercase tracking-widest text-neo-cyan font-bold text-[10px]">
              <Terminal className="w-3 h-3" /> {showLogs ? 'Hide Logs' : 'Show Logs'}
              <span className="text-gray-500 normal-case">({logs.length})</span>
            </button>
            {showLogs && (
              <div className={cn('mt-2 rounded border border-neo-cyan/20 p-2 text-[9px] text-gray-300 whitespace-pre-wrap break-words max-h-44 overflow-y-auto', logs.length === 0 && 'text-gray-500')}>
                {hiddenCount > 0 && <div className="text-neo-cyan/70 mb-1">+ {hiddenCount} more logs</div>}
                {visibleLogs.length > 0 ? visibleLogs.map((line, i) => <div key={`${job.id}-${i}`}>{line}</div>) : <div>No logs yet.</div>}
              </div>
            )}
          </div>

          {job.status === 'failed' && (
            <div className="flex items-center gap-1 text-neo-magenta uppercase tracking-widest font-bold text-[10px]"><AlertTriangle className="w-3 h-3" /> Inspect diagnostics for failure root cause.</div>
          )}
        </div>
      )}
    </div>
  );
}
