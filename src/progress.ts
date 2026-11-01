// Per-workout performance progression: extract one comparable numeric metric
// from each logged session and group by workout so we can chart "am I getting
// better" over time. Runs trend by pace, grouped by preset (all Easy runs
// together, however far each one went).

import { byId } from './plan';
import { logKind, hasResults } from './logSummary';
import { keyPace, runPreset } from './runs';
import type { WorkoutLog } from './types';

export type MetricUnit = 'time' | 'rounds' | 'cal' | 'pace';

export interface MetricPoint {
  date: string; // ISO yyyy-mm-dd
  value: number;
  logId: string;
}

export interface WorkoutProgress {
  key: string;
  name: string;
  unit: MetricUnit;
  lowerBetter: boolean;
  points: MetricPoint[]; // chronological
}

// The primary comparable metric for a single session, or null if the log has
// nothing numeric to trend (e.g. only felt-rating or free notes).
function extractMetric(l: WorkoutLog): { value: number; unit: MetricUnit; lowerBetter: boolean } | null {
  if (l.run) {
    const pace = keyPace(l.run, l.totalTimeSec);
    return pace ? { value: pace, unit: 'pace', lowerBetter: true } : null;
  }
  if (l.totalTimeSec != null) return { value: l.totalTimeSec, unit: 'time', lowerBetter: true };
  if (l.amrap) {
    if (l.amrap.fullRounds != null || l.amrap.partialReps != null) {
      return { value: l.amrap.fullRounds ?? 0, unit: 'rounds', lowerBetter: false };
    }
    if (l.amrap.totalCalories != null) {
      return { value: l.amrap.totalCalories, unit: 'cal', lowerBetter: false };
    }
  }
  return null;
}

function identity(l: WorkoutLog): { key: string; name: string } | null {
  if (l.run) return { key: `r:${l.run.preset}`, name: runPreset(l.run.preset).name };
  const kind = logKind(l);
  if (kind === 'custom') {
    const key = l.workoutId ?? l.customName;
    if (!key) return null;
    return { key: `c:${key}`, name: l.customName ?? l.workoutSnapshot?.name ?? 'Workout' };
  }
  if (kind === 'plan' && l.dayId) {
    return { key: `p:${l.dayId}`, name: byId(l.dayId)?.workoutLabel ?? 'Workout' };
  }
  return null;
}

// Build progression series for every workout logged at least `minSessions`
// times with a consistent, comparable metric. Newest-improvement first.
export function buildProgress(logs: WorkoutLog[], minSessions = 2): WorkoutProgress[] {
  const groups = new Map<string, WorkoutProgress>();

  for (const l of logs) {
    if (!hasResults(l)) continue;
    const metric = extractMetric(l);
    const id = identity(l);
    if (!metric || !id) continue;

    let g = groups.get(id.key);
    if (!g) {
      g = { key: id.key, name: id.name, unit: metric.unit, lowerBetter: metric.lowerBetter, points: [] };
      groups.set(id.key, g);
    }
    // Only collect points that share the group's metric unit (a workout's format
    // is stable, but guard against an odd mixed log).
    if (metric.unit !== g.unit) continue;
    g.points.push({ date: l.date, value: metric.value, logId: l.id });
  }

  const out: WorkoutProgress[] = [];
  for (const g of groups.values()) {
    if (g.points.length < minSessions) continue;
    g.points.sort((a, b) => a.date.localeCompare(b.date));
    out.push(g);
  }
  // Most recently trained first.
  out.sort((a, b) => b.points[b.points.length - 1].date.localeCompare(a.points[a.points.length - 1].date));
  return out;
}

// First → latest change, expressed as improvement (positive value = better).
export function trend(p: WorkoutProgress): { delta: number; improved: boolean | null } {
  const first = p.points[0].value;
  const last = p.points[p.points.length - 1].value;
  const raw = last - first;
  if (raw === 0) return { delta: 0, improved: null };
  const improved = p.lowerBetter ? raw < 0 : raw > 0;
  return { delta: raw, improved };
}
