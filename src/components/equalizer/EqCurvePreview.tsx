import { cn } from '../../lib/utils';

interface EqCurvePreviewProps {
  bandValues: number[];
  active?: boolean;
  label?: string;
}

export function EqCurvePreview({ bandValues, active, label }: EqCurvePreviewProps) {
  const values = bandValues.slice(0, 10);
  const width = 120;
  const height = 44;
  const step = values.length > 1 ? width / (values.length - 1) : width;
  const points = values
    .map((value, index) => {
      const clamped = Math.max(-24, Math.min(12, value));
      const x = index * step;
      const y = height - ((clamped + 24) / 36) * height;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');

  return (
    <div className={cn('relative h-14 w-full overflow-hidden rounded border bg-black/50', active ? 'border-neo-cyan shadow-[0_0_14px_rgba(0,240,255,0.35)]' : 'border-gray-800')}>
      {label && (
        <span className="absolute left-2 top-1 z-10 font-mono text-[8px] uppercase tracking-widest text-neo-cyan/70">
          {label}
        </span>
      )}
      <svg
        aria-label={label ? `${label} curve preview` : 'EQ curve preview'}
        role="img"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full p-2"
      >
        <defs>
          <linearGradient id="eqCurvePreviewGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#00f0ff" />
            <stop offset="50%" stopColor="#ff00ff" />
            <stop offset="100%" stopColor="#fce205" />
          </linearGradient>
        </defs>
        <line x1="0" x2={width} y1={height * 0.66} y2={height * 0.66} stroke="rgba(0,240,255,0.2)" strokeWidth="1" />
        <polyline points={points} fill="none" stroke="url(#eqCurvePreviewGradient)" strokeWidth="3" vectorEffect="non-scaling-stroke" />
        {values.map((value, index) => {
          const clamped = Math.max(-24, Math.min(12, value));
          const x = index * step;
          const y = height - ((clamped + 24) / 36) * height;
          return <circle key={`${index}-${value}`} cx={x} cy={y} r="1.8" fill="#fce205" />;
        })}
      </svg>
    </div>
  );
}
