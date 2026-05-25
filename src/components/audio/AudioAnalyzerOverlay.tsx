import { useEffect, useMemo, useRef } from 'react';
import { useAnalyzerStore } from '../../store/useAnalyzerStore';
import { usePlayerStore } from '../../store/usePlayerStore';
import { cn } from '../../lib/utils';

function deterministic(seed: string, count: number) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return Array.from({ length: count }).map((_, i) => {
    const v = (Math.sin(h + i * 1.37) + 1) / 2;
    return v;
  });
}

export function AudioAnalyzerOverlay() {
  const { isAnalyzerOpen, analyzerMode, setAnalyzerMode, setAnalyzerOpen } = useAnalyzerStore();
  const { analyserNode, isPlaying, currentTrackId } = usePlayerStore();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const fallback = useMemo(() => deterministic(`${currentTrackId || 'none'}-${analyzerMode}`, 128), [currentTrackId, analyzerMode]);

  useEffect(() => {
    if (!isAnalyzerOpen || !canvasRef.current) return;
    const canvas = canvasRef.current;
    let ctx: CanvasRenderingContext2D | null = null;
    try {
      ctx = canvas.getContext('2d');
    } catch {
      return;
    }
    if (!ctx) return;

    let raf = 0;
    const reduceMotion = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const drawFallback = (t: number) => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(4,8,16,0.95)';
      ctx.fillRect(0, 0, w, h);

      if (analyzerMode === 'waveform') {
        ctx.strokeStyle = '#00f0ff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        fallback.forEach((v, i) => {
          const x = (i / (fallback.length - 1)) * w;
          const idleOffset = reduceMotion ? 0 : Math.sin(t / 1000 + i * 0.2) * 4;
          const y = h * 0.5 + (v - 0.5) * h * 0.4 + idleOffset;
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        });
        ctx.stroke();
      } else {
        const bars = 64;
        for (let i = 0; i < bars; i++) {
          const v = fallback[i % fallback.length];
          const idle = reduceMotion ? 0 : (Math.sin(t / 900 + i * 0.35) + 1) * 0.08;
          const bh = (0.2 + v * 0.35 + idle) * h;
          const bw = w / bars - 2;
          const x = i * (w / bars);
          const y = h - bh;
          ctx.fillStyle = analyzerMode === 'reactor' ? '#39ff14' : '#00f0ff';
          if (analyzerMode === 'reactor') {
            const cx = w / 2;
            const cy = h / 2;
            const a = (i / bars) * Math.PI * 2;
            const r = h * 0.24 + bh * 0.28;
            ctx.fillRect(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 2, 2);
          } else {
            ctx.fillRect(x, y, bw, bh);
          }
        }

        if (analyzerMode === 'stereo') {
          ctx.strokeStyle = '#ff00ff';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(w / 2, 0);
          ctx.lineTo(w / 2, h);
          ctx.stroke();
        }
      }

      ctx.fillStyle = '#94a3b8';
      ctx.font = '12px monospace';
      ctx.fillText('NO LIVE SIGNAL', 16, 24);
    };

    const freq = analyserNode ? new Uint8Array(analyserNode.frequencyBinCount) : null;
    const time = analyserNode ? new Uint8Array(analyserNode.fftSize) : null;

    const drawLive = () => {
      if (!ctx || !canvas || !analyserNode || !freq || !time) return;
      const w = canvas.width;
      const h = canvas.height;
      analyserNode.getByteFrequencyData(freq);
      analyserNode.getByteTimeDomainData(time);
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(4,8,16,0.92)';
      ctx.fillRect(0, 0, w, h);

      if (analyzerMode === 'spectrum') {
        const bars = 80;
        const step = Math.max(1, Math.floor(freq.length / bars));
        for (let i = 0; i < bars; i++) {
          const val = freq[Math.min(i * step, freq.length - 1)] || 0;
          const v = val / 255;
          const bh = Math.max(4, v * h);
          const bw = w / bars - 1;
          ctx.fillStyle = i < bars * 0.33 ? '#00f0ff' : i < bars * 0.66 ? '#ff00ff' : '#39ff14';
          ctx.fillRect(i * (w / bars), h - bh, bw, bh);
        }
      } else if (analyzerMode === 'waveform') {
        ctx.strokeStyle = '#00f0ff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < time.length; i++) {
          const x = (i / (time.length - 1)) * w;
          const y = (time[i] / 255) * h;
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
      } else if (analyzerMode === 'stereo') {
        ctx.strokeStyle = '#ff00ff';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(w / 2, 0);
        ctx.lineTo(w / 2, h);
        ctx.stroke();
        const half = Math.floor(freq.length / 2);
        const left = freq.slice(0, half).reduce((a, b) => a + b, 0) / (half * 255);
        const right = freq.slice(half).reduce((a, b) => a + b, 0) / (half * 255);
        ctx.fillStyle = '#00f0ff';
        ctx.fillRect(w * 0.1, h * (1 - left), w * 0.35, h * left);
        ctx.fillStyle = '#39ff14';
        ctx.fillRect(w * 0.55, h * (1 - right), w * 0.35, h * right);
        ctx.fillStyle = '#94a3b8';
        ctx.font = '12px monospace';
        ctx.fillText('STEREO FIELD ESTIMATE', 16, 24);
      } else {
        const bands = 64;
        const step = Math.max(1, Math.floor(freq.length / bands));
        const bass = freq.slice(0, Math.floor(freq.length * 0.1)).reduce((a, b) => a + b, 0) / Math.max(1, Math.floor(freq.length * 0.1)) / 255;
        const cx = w / 2;
        const cy = h / 2;
        ctx.beginPath();
        ctx.fillStyle = `rgba(0,240,255,${0.3 + bass * 0.7})`;
        ctx.arc(cx, cy, 24 + bass * 28, 0, Math.PI * 2);
        ctx.fill();
        for (let i = 0; i < bands; i++) {
          const v = freq[i * step] / 255;
          const a = (i / bands) * Math.PI * 2;
          const r1 = 60;
          const r2 = 60 + v * 80;
          ctx.strokeStyle = i % 2 ? '#ff00ff' : '#39ff14';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
          ctx.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2);
          ctx.stroke();
        }
      }
    };

    const animate = (t: number) => {
      const live = Boolean(analyserNode && isPlaying && currentTrackId);
      if (live) drawLive();
      else drawFallback(t);
      raf = requestAnimationFrame(animate);
    };

    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [analyserNode, analyzerMode, currentTrackId, fallback, isAnalyzerOpen, isPlaying]);

  const metrics = useMemo(() => {
    if (!analyserNode || !isPlaying) return { bass: 0, mid: 0, treble: 0, peak: 0, clipping: false, status: currentTrackId ? 'IDLE' : 'NO TRACK' };
    const arr = new Uint8Array(analyserNode.frequencyBinCount);
    analyserNode.getByteFrequencyData(arr);
    const seg = Math.floor(arr.length / 3);
    const avg = (slice: Uint8Array) => slice.reduce((a, b) => a + b, 0) / Math.max(1, slice.length) / 255;
    const bass = avg(arr.slice(0, seg));
    const mid = avg(arr.slice(seg, seg * 2));
    const treble = avg(arr.slice(seg * 2));
    const peak = Math.max(...Array.from(arr)) / 255;
    return { bass, mid, treble, peak, clipping: peak > 0.97, status: 'LIVE' };
  }, [analyserNode, isPlaying, currentTrackId]);

  if (!isAnalyzerOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] bg-black/85 backdrop-blur-sm p-3 md:p-6">
      <div className="max-w-6xl mx-auto h-full armored-frame bg-[#06070e] border-neo-cyan/40 p-4 md:p-6 flex flex-col">
        <div className="flex items-center justify-between gap-4 mb-3">
          <div>
            <h2 className="text-2xl md:text-3xl font-black italic text-neo-cyan tracking-widest">AUDIO ANALYZER</h2>
            <p className="text-xs font-mono tracking-[0.2em] text-neo-magenta">LIVE SIGNAL INSPECTION</p>
          </div>
          <button aria-label="Close analyzer" className="px-3 py-2 border border-neo-magenta text-neo-magenta" onClick={() => setAnalyzerOpen(false)}>Close</button>
        </div>

        <div className="flex flex-wrap gap-2 mb-3">
          {(['spectrum', 'waveform', 'stereo', 'reactor'] as const).map((mode) => (
            <button key={mode} className={cn('px-3 py-2 text-xs uppercase tracking-widest border', analyzerMode === mode ? 'border-neo-cyan text-neo-cyan bg-neo-cyan/10' : 'border-gray-700 text-gray-300')} onClick={() => setAnalyzerMode(mode)}>
              {mode}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr,260px] gap-3 flex-1 min-h-0">
          <div className="cyber-panel p-2 min-h-[300px]">
            <canvas ref={canvasRef} width={1200} height={560} className="w-full h-full rounded border border-gray-800 bg-black" />
          </div>
          <div className="cyber-panel p-3 space-y-2 text-xs font-mono">
            <p>STATUS: <span className="text-neo-cyan">{analyserNode ? metrics.status : 'ANALYSER OFFLINE'}</span></p>
            <p>BASS ENERGY: <span className="text-neo-lime">{(metrics.bass * 100).toFixed(1)}%</span></p>
            <p>MID ENERGY: <span className="text-neo-magenta">{(metrics.mid * 100).toFixed(1)}%</span></p>
            <p>TREBLE ENERGY: <span className="text-neo-yellow">{(metrics.treble * 100).toFixed(1)}%</span></p>
            <p>PEAK EST: <span className="text-white">{(metrics.peak * 100).toFixed(1)}%</span></p>
            <p>CLIPPING: <span className={metrics.clipping ? 'text-orange-400' : 'text-gray-400'}>{metrics.clipping ? 'WARNING' : 'NO'}</span></p>
            <p className="text-gray-400">Stereo mode is an estimate from analyzer bands, not discrete channel metering.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
