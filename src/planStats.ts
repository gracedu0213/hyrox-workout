// Pure stats for committed plans: weekly cadence progress, streaks, and
// per-day heatmap state. Mon-first weeks throughout.

import { isoDate, mondayOfWeek } from './dateUtils';
import { hasResults, logKind } from './logSummary';
import type { UserPlan, WorkoutLog } from './types';

// A session counts toward a plan when it's attributed to that plan, has
// results, and isn't a rest day.
export function isQualifying(l: WorkoutLog, planId: string): boolean {
  return l.planId === planId && logKind(l) !== 'rest' && hasResults(l);
}

// Group a plan's qualifying logs into Mon-first week buckets, keyed by the
// ISO date of that week's Monday.
export function weekBuckets(logs: WorkoutLog[], planId: string): Map<string, WorkoutLog[]> {
  const m = new Map<string, WorkoutLog[]>();
  for (const l of logs) {
    if (!isQualifying(l, planId)) continue;
    const key = isoDate(mondayOfWeek(new Date(`${l.date}T00:00:00`)));
    if (!m.has(key)) m.set(key, []);
    m.get(key)!.push(l);
  }
  return m;
}

// Sessions done this week vs the plan's weekly goal (if any).
export function weekProgress(
  logs: WorkoutLog[],
  plan: UserPlan,
  refDate = new Date(),
): { done: number; goal?: number } {
  const weekKey = isoDate(mondayOfWeek(refDate));
  const done = weekBuckets(logs, plan.id).get(weekKey)?.length ?? 0;
  return { done, goal: plan.goalPerWeek };
}

// Consecutive Mon-first weeks containing at least one logged (non-rest) workout,
// counting back from now. Plan-agnostic — the "did I train this week" streak for
// the Overview, graced on the current week like computeStreak.
export function computeActivityStreak(logs: WorkoutLog[], refDate = new Date()): number {
  const weeks = new Set<string>();
  for (const l of logs) {
    if (logKind(l) === 'rest' || !hasResults(l)) continue;
    weeks.add(isoDate(mondayOfWeek(new Date(`${l.date}T00:00:00`))));
  }
  const cursor = mondayOfWeek(refDate);
  let streak = 0;
  if (weeks.has(isoDate(cursor))) streak++;
  cursor.setDate(cursor.getDate() - 7);
  while (weeks.has(isoDate(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 7);
  }
  return streak;
}

// Consecutive weeks meeting the cadence target, counting back from now.
// The current (in-progress) week is graced: it adds to the streak when already
// met, but an unmet current week never breaks it.
export function computeStreak(
  logs: WorkoutLog[],
  plan: UserPlan,
  refDate = new Date(),
): number {
  const target = plan.goalPerWeek && plan.goalPerWeek > 0 ? plan.goalPerWeek : 1;
  const buckets = weekBuckets(logs, plan.id);
  const qualifies = (weekStart: Date) =>
    (buckets.get(isoDate(weekStart))?.length ?? 0) >= target;

  const cursor = mondayOfWeek(refDate);
  let streak = 0;

  // Current week: count it if met, but don't break the streak if not.
  if (qualifies(cursor)) streak++;
  cursor.setDate(cursor.getDate() - 7);

  // Prior weeks: walk back until one falls short.
  while (qualifies(cursor)) {
    streak++;
    cursor.setDate(cursor.getDate() - 7);
  }
  return streak;
}
