import { formatSec } from './format';
import { FELT_EMOJI } from './components/FeltPicker';
import type { WorkoutLog } from './types';

export function logKind(l: WorkoutLog): 'plan' | 'custom' | 'rest' {
  if (l.kind) return l.kind;
  if (l.dayId) return 'plan';
  if (l.customName) return 'custom';
  return 'rest';
}

export function logSummary(l: WorkoutLog): string {
  const kind = logKind(l);
  if (kind === 'rest') return 'Rest day';
  if (l.status === 'planned' && !hasResults(l)) return 'Planned — no results yet';
  const parts: string[] = [];
  if (l.totalTimeSec != null) parts.push(formatSec(l.totalTimeSec));
  if (l.amrap) {
    if (l.amrap.fullRounds != null || l.amrap.partialReps != null) {
      const r = l.amrap.fullRounds ?? 0;
      const p = l.amrap.partialReps ?? 0;
      parts.push(`${r}+${p}`);
    }
    if (l.amrap.totalCalories != null) parts.push(`${l.amrap.totalCalories} cal`);
    if (l.amrap.perWindow?.length) {
      const w = l.amrap.perWindow
        .map((win) => {
          if (win.fullRounds == null && win.partialReps == null) return null;
          return `${win.fullRounds ?? 0}+${win.partialReps ?? 0}`;
        })
        .filter(Boolean)
        .join(' / ');
      if (w) parts.push(`(${w})`);
    }
  }
  if (l.intervals?.splits?.length) {
    parts.push(`${l.intervals.splits.length} intervals logged`);
  }
  if (l.feltLike) parts.push(FELT_EMOJI[l.feltLike]);
  return parts.join(' · ');
}

// Group logs by their training date (ISO) — the shape every calendar view needs.
export function groupLogsByDate(logs: WorkoutLog[]): Map<string, WorkoutLog[]> {
  const m = new Map<string, WorkoutLog[]>();
  for (const l of logs) {
    if (!m.has(l.date)) m.set(l.date, []);
    m.get(l.date)!.push(l);
  }
  return m;
}

export function hasResults(l: WorkoutLog): boolean {
  if (logKind(l) === 'rest') return true; // rest day is "done" by itself
  return (
    l.totalTimeSec != null ||
    !!l.roundSplits?.length ||
    !!l.amrap ||
    !!l.intervals?.splits?.length ||
    !!l.exercises?.length ||
    !!l.notes ||
    !!l.feltLike
  );
}
