import { useEffect, useMemo, useState } from 'react';
import { NEO_BOOT_HERO, NEO_BOOT_INITIALIZING } from '../../lib/neoAudioAssets';

const STAGE_INITIALIZING_MS = 1200;
const STAGE_TRANSITION_MS = 1100;
const STAGE_HERO_MS = 1200;
const FADE_OUT_MS = 300;
const FAILSAFE_MS = 4600;

type BootStage = 'initializing' | 'loading' | 'ready';

const stageSchedule: Array<{ delay: number; stage: BootStage }> = [
  { delay: STAGE_INITIALIZING_MS, stage: 'loading' },
  { delay: STAGE_INITIALIZING_MS + STAGE_TRANSITION_MS, stage: 'ready' },
];

export const NEO_BOOT_SEQUENCE_DURATION_MS =
  STAGE_INITIALIZING_MS + STAGE_TRANSITION_MS + STAGE_HERO_MS;

type BootSequenceProps = {
  onComplete: () => void;
};

export function BootSequence({ onComplete }: BootSequenceProps) {
  const [stage, setStage] = useState<BootStage>('initializing');
  const [isExiting, setIsExiting] = useState(false);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  const activeArtwork = stage === 'initializing' ? NEO_BOOT_INITIALIZING : NEO_BOOT_HERO;
  const activeArtworkFailed = Boolean(failedImages[activeArtwork]);
  const bothImagesFailed = Boolean(failedImages[NEO_BOOT_INITIALIZING] && failedImages[NEO_BOOT_HERO]);

  const statusLines = useMemo(() => {
    if (stage === 'initializing') {
      return ['Audio core handshake', 'Signal path calibration', 'Library matrix check'];
    }

    if (stage === 'loading') {
      return ['Loading N.E.O Audio Lab', 'Routing modules', 'Finalizing startup'];
    }

    return ['Core online', 'Ready'];
  }, [stage]);

  useEffect(() => {
    const timers = [
      ...stageSchedule.map(({ delay, stage: nextStage }) =>
        window.setTimeout(() => setStage(nextStage), delay),
      ),
      window.setTimeout(() => setIsExiting(true), NEO_BOOT_SEQUENCE_DURATION_MS),
      window.setTimeout(onComplete, NEO_BOOT_SEQUENCE_DURATION_MS + FADE_OUT_MS),
      window.setTimeout(onComplete, FAILSAFE_MS),
    ];

    return () => {
      timers.forEach(window.clearTimeout);
    };
  }, [onComplete]);

  const handleImageError = (src: string) => {
    setFailedImages(current => ({ ...current, [src]: true }));
  };

  return (
    <section
      aria-label="N.E.O Audio Lab startup boot sequence"
      className={`neo-boot-sequence ${isExiting ? 'neo-boot-sequence--exiting' : ''}`}
      data-stage={stage}
      data-testid="boot-sequence"
    >
      <div className="neo-boot-vignette" />
      <div className="neo-boot-scanline" />

      {!bothImagesFailed && (
        <img
          alt=""
          aria-hidden="true"
          className="neo-boot-backdrop"
          onError={() => handleImageError(activeArtwork)}
          src={activeArtwork}
        />
      )}

      <div className="neo-boot-frame">
        {!activeArtworkFailed ? (
          <img
            alt={stage === 'initializing' ? 'N.E.O system initializing artwork' : 'N.E.O Audio Lab hero artwork'}
            className="neo-boot-artwork"
            onError={() => handleImageError(activeArtwork)}
            src={activeArtwork}
          />
        ) : (
          <div className="neo-boot-fallback" role="img" aria-label="N.E.O Audio Lab startup artwork fallback">
            <span>N.E.O</span>
          </div>
        )}
      </div>

      <div className="neo-boot-copy">
        <p className="neo-boot-kicker">{stage === 'initializing' ? 'SYSTEM INITIALIZING' : 'N.E.O AUDIO LAB'}</p>
        <div className="neo-boot-status" aria-live="polite">
          {statusLines.map(line => (
            <span key={line}>{line}</span>
          ))}
        </div>
        <div className="neo-boot-progress" aria-hidden="true">
          <span />
        </div>
      </div>
    </section>
  );
}
