import { FELT_EMOJI } from './FeltPicker';
import { formatSec } from '../format';
import { runDistanceKm, timeAndPace } from '../runs';
import type { WorkoutLog } from '../types';

interface Props {
  log: WorkoutLog;
  size?: 'card' | 'page';
}

export default function ResultHero({ log, size = 'card' }: Props) {
  const hasTime = log.totalTimeSec != null;
  const amrap = log.amrap;
  const hasAmrap = amrap && (amrap.fullRounds != null || amrap.partialReps != null);
  const hasCals = amrap?.totalCalories != null;
  const intervals = log.intervals?.splits?.length ?? 0;

  let headline: React.ReactNode = null;
  let label = 'Result';
  const runKm = log.run ? runDistanceKm(log.run) : undefined;
  if (log.run && runKm) {
    headline = <>{runKm}<span className="text-3xl opacity-60 ml-1">km</span></>;
    label = timeAndPace(log.run, log.totalTimeSec) || 'Distance';
  } else if (hasTime) {
    headline = formatSec(log.totalTimeSec!);
    label = 'Total time';
  } else if (hasAmrap) {
    headline = (
      <>
        {amrap!.fullRounds ?? 0}
        <span className="opacity-60">+{amrap!.partialReps ?? 0}</span>
      </>
    );
    label = 'Rounds + reps';
  } else if (hasCals) {
    headline = <>{amrap!.totalCalories}<span className="text-3xl opacity-60 ml-1">cal</span></>;
    label = 'Calories';
  } else if (intervals > 0) {
    headline = intervals;
    label = intervals === 1 ? 'Interval logged' : 'Intervals logged';
  }

  if (headline == null && !log.feltLike) {
    return (
      <div className="py-6 text-center text-sm text-muted">No results recorded.</div>
    );
  }

  const headlineSize =
    size === 'page'
      ? 'text-[clamp(5rem,26vw,9rem)]'
      : 'text-[clamp(4.5rem,22vw,7rem)]';
  const stickerSize = size === 'page' ? 'w-20 h-20 text-4xl -right-2 -bottom-3' : 'w-14 h-14 text-3xl -right-1 -bottom-2';
  const wrapperPadding = size === 'page' ? 'py-10' : 'py-6';

  return (
    <div
      className={`relative overflow-hidden ${wrapperPadding}`}
      style={{
        background:
          'radial-gradient(ellipse at 20% 0%, rgba(255,213,0,0.12), transparent 55%), radial-gradient(ellipse at 100% 100%, rgba(255,107,107,0.10), transparent 55%)',
      }}
    >
      <span className="absolute top-2 right-3 text-accent/50 text-sm">✦</span>
      <span className="absolute bottom-2 left-4 text-engine/40 text-xs">✦</span>

      <div className="relative flex items-center justify-center px-4">
        {headline != null && (
          <div
            className={`font-display leading-[0.85] tracking-[-0.045em] bg-clip-text text-transparent ${headlineSize}`}
            style={{
              backgroundImage:
                'linear-gradient(135deg, #FFD500 0%, #F0E040 35%, #FF9B5C 70%, #FF6B6B 100%)',
            }}
          >
            {headline}
          </div>
        )}
        {log.feltLike && (
          <div
            className={`absolute rounded-full bg-panel2 ring-[3px] ring-bg flex items-center justify-center shadow-xl shadow-black/40 rotate-[-12deg] ${stickerSize}`}
          >
            {FELT_EMOJI[log.feltLike]}
          </div>
        )}
      </div>

      <div className="text-center text-[10px] uppercase tracking-[0.25em] text-muted mt-3 font-semibold">
        {label}
      </div>
    </div>
  );
}
