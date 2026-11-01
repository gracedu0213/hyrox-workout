import { useEffect, useState } from 'react';
import { getAllLogs } from '../db';
import { hasResults } from '../logSummary';
import { runSummary } from '../runs';
import { FELT_EMOJI } from './FeltPicker';
import { formatSec } from '../format';
import { isoDate as iso, mondayOfWeek } from '../dateUtils';
import type { WorkoutLog } from '../types';

interface Props {
  log: WorkoutLog;
  onDismiss: () => void;
}

const GREETINGS = [
  ['NICE', 'WORK.'],
  ["LET'S", 'GO.'],
  ['CRUSHED', 'IT.'],
  ['YOU', 'DID IT.'],
  ['GET', 'SOME.'],
  ['BOOM.', ''],
  ['DONE', 'AND DONE.'],
];


function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function resultLine(log: WorkoutLog): string | null {
  if (log.run) return runSummary(log.run, log.totalTimeSec) || null;
  if (log.totalTimeSec != null) return formatSec(log.totalTimeSec);
  if (log.amrap) {
    if (log.amrap.fullRounds != null || log.amrap.partialReps != null) {
      return `${log.amrap.fullRounds ?? 0}+${log.amrap.partialReps ?? 0}`;
    }
    if (log.amrap.totalCalories != null) return `${log.amrap.totalCalories} cal`;
  }
  if (log.intervals?.splits?.length) return `${log.intervals.splits.length} intervals`;
  return null;
}

export default function CelebrationScreen({ log, onDismiss }: Props) {
  const [stats, setStats] = useState<{ streak: number; thisWeek: number; total: number } | null>(null);

  const greeting = GREETINGS[hashCode(log.id) % GREETINGS.length];

  useEffect(() => {
    getAllLogs().then((all) => {
      const done = all.filter(hasResults);
      const total = done.length;

      const today = new Date(`${log.date}T00:00:00`);
      const weekStartStr = iso(mondayOfWeek(today));
      const thisWeek = done.filter((l) => l.date >= weekStartStr && l.date <= log.date).length;

      const datesSet = new Set(done.map((l) => l.date));
      let streak = 0;
      const d = new Date(`${log.date}T00:00:00`);
      while (datesSet.has(iso(d))) {
        streak++;
        d.setDate(d.getDate() - 1);
      }

      setStats({ streak, thisWeek, total });
    });
  }, [log.date, log.id]);

  // Lock body scroll while overlay is up; always restore to empty on
  // unmount so we can't leave the page un-scrollable.
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const result = resultLine(log);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col overflow-hidden"
      style={{
        background:
          'radial-gradient(ellipse at 20% 0%, rgba(255,213,0,0.18), transparent 55%), radial-gradient(ellipse at 100% 100%, rgba(255,107,107,0.16), transparent 55%), #1a1a1a',
      }}
    >
      {/* Sparkles scattered around */}
      <span className="absolute top-10 right-8 text-accent text-2xl select-none">✦</span>
      <span className="absolute top-28 left-6 text-engine text-base opacity-70 select-none">✦</span>
      <span className="absolute top-44 right-14 text-power text-sm opacity-60 select-none">✦</span>
      <span className="absolute bottom-40 left-10 text-accent text-lg opacity-60 select-none">✦</span>
      <span className="absolute bottom-24 right-6 text-engine text-base opacity-60 select-none">✦</span>

      <button
        onClick={onDismiss}
        aria-label="Dismiss"
        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-panel2/80 backdrop-blur flex items-center justify-center text-white/70 text-xl active:scale-95"
      >
        ×
      </button>

      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center pt-12 pb-4">
        <div className="text-[10px] uppercase tracking-[0.3em] text-accent font-black mb-4">Workout logged</div>

        <h1
          className="font-display leading-[0.85] tracking-[-0.045em] bg-clip-text text-transparent"
          style={{
            backgroundImage:
              'linear-gradient(135deg, #FFD500 0%, #F0E040 35%, #FF9B5C 70%, #FF6B6B 100%)',
            fontSize: 'clamp(4.5rem, 20vw, 8.5rem)',
          }}
        >
          <div>{greeting[0]}</div>
          {greeting[1] && <div>{greeting[1]}</div>}
        </h1>

        {result && (
          <div className="mt-6 font-display text-3xl text-white/95 tracking-[-0.02em] flex items-center gap-3">
            <span>{result}</span>
            {log.feltLike && (
              <span className="inline-block text-4xl rotate-[-10deg] leading-none">{FELT_EMOJI[log.feltLike]}</span>
            )}
          </div>
        )}

        {stats && (
          <div className="mt-10 grid grid-cols-3 gap-3 w-full max-w-xs">
            <Stat icon="🔥" label="Streak" value={`${stats.streak}d`} />
            <Stat icon="💪" label="This week" value={String(stats.thisWeek)} />
            <Stat icon="📊" label="Total" value={String(stats.total)} />
          </div>
        )}

        {stats && stats.streak >= 3 && (
          <div className="mt-6 text-sm text-white/70">
            <span className="font-semibold text-accent">{stats.streak}-day streak.</span> Keep it lit. 🔥
          </div>
        )}
        {stats && stats.streak < 3 && stats.thisWeek >= 3 && (
          <div className="mt-6 text-sm text-white/70">
            <span className="font-semibold text-accent">{stats.thisWeek} this week.</span> You're cooking.
          </div>
        )}
        {stats && stats.total === 1 && (
          <div className="mt-6 text-sm text-white/70">
            First one down. <span className="font-semibold text-accent">Welcome.</span>
          </div>
        )}
      </div>

      <div className="px-6 pb-10 pt-2 relative">
        <button
          onClick={onDismiss}
          className="w-full bg-accent text-bg rounded-full py-4 font-black uppercase tracking-widest text-sm shadow-lg shadow-accent/30 active:scale-[0.98]"
        >
          Keep going →
        </button>
      </div>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="bg-panel/60 backdrop-blur rounded-lg py-3 px-2 border border-line/60">
      <div className="text-xl leading-none">{icon}</div>
      <div className="font-display text-2xl mt-1.5 tracking-tight leading-none">{value}</div>
      <div className="text-[9px] uppercase tracking-widest text-muted mt-1.5">{label}</div>
    </div>
  );
}
