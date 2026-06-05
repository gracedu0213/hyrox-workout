// Helpers around the UserPlan entity, including the synthetic descriptor for
// the curated 12-week program (which has no DB row until the user commits).

import { CURATED_PLAN_ID } from './db';
import type { DayOfWeek, PlanSlot, PlanWeek, UserPlan } from './types';

export const CURATED_WEEKS = 12;

// Synthetic, un-started descriptor for the curated 12-week program. A real DB
// row (with active/createdAt) replaces this once the user taps Start.
export function curatedDescriptor(): UserPlan {
  return {
    id: CURATED_PLAN_ID,
    name: '12-Week HYROX Program',
    color: '#FF6B6B',
    icon: '🏋️',
    content: { type: 'curated' },
    active: false,
    createdAt: 0,
  };
}

export function isCurated(p: UserPlan): boolean {
  return p.id === CURATED_PLAN_ID;
}

// Merge the synthetic curated descriptor with DB rows, deduping by id so the
// curated plan shows in the library whether or not it's been committed yet.
export function withCurated(dbPlans: UserPlan[]): UserPlan[] {
  if (dbPlans.some((p) => p.id === CURATED_PLAN_ID)) return dbPlans;
  return [curatedDescriptor(), ...dbPlans];
}

// Number of weeks of structured content (0 for goal-only/cadence plans — a
// cadence pool is a flat menu, not weeks).
export function planWeekCount(p: UserPlan): number {
  if (!p.content) return 0;
  if (p.content.type === 'curated') return CURATED_WEEKS;
  if (p.content.type === 'pool') return 0;
  return p.content.weeks.length;
}

// Cadence = a weekly target (with an optional go-to pool + duration), as opposed
// to the curated program or a week-by-week sequenced plan.
export function isCadence(p: UserPlan): boolean {
  return !isCurated(p) && p.goalPerWeek != null;
}

// The go-to workouts attached to a cadence plan (empty if none).
export function poolSlots(p: UserPlan): PlanSlot[] {
  return p.content?.type === 'pool' ? p.content.slots : [];
}

// --- PlanWeek slot helpers ---

export function slotForDay(week: PlanWeek, dow: DayOfWeek): PlanSlot | undefined {
  return week.slots.find((s) => s.dayOfWeek === dow);
}

// Slots not pinned to a weekday ("any day this week").
export function anytimeSlots(week: PlanWeek): PlanSlot[] {
  return week.slots.filter((s) => !s.dayOfWeek);
}

export function hasDayedSlots(week: PlanWeek): boolean {
  return week.slots.some((s) => s.dayOfWeek);
}

// Replace (or clear) the slot pinned to a given weekday, immutably.
export function withDaySlot(week: PlanWeek, dow: DayOfWeek, slot: PlanSlot | undefined): PlanWeek {
  const slots = week.slots.filter((s) => s.dayOfWeek !== dow);
  if (slot) slots.push({ ...slot, dayOfWeek: dow });
  return { slots };
}

// Short human label for a plan's shape, e.g. "12 weeks", "5×/week · 8 weeks".
export function planSubtitle(p: UserPlan): string {
  if (isCadence(p)) {
    const span = p.durationWeeks ? `${p.durationWeeks} week${p.durationWeeks === 1 ? '' : 's'}` : 'ongoing';
    return `${p.goalPerWeek}×/week · ${span}`;
  }
  const weeks = planWeekCount(p);
  return weeks > 0 ? `${weeks} week${weeks === 1 ? '' : 's'}` : 'Plan';
}
