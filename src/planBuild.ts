// Builders shared by the curated program transcriptions (plan.ts, planPro.ts).

import type { Day, Exercise } from './types';

export const ex = (name: string, qty?: number, unit?: Exercise['unit'], extra: Partial<Exercise> = {}): Exercise =>
  ({ name, qty, unit, ...extra });

export const day = (
  id: string, week: number, phase: Day['phase'], dayOfWeek: Day['dayOfWeek'],
  category: Day['category'], workoutLabel: string, setup: Day['setup'],
  exercises: Exercise[], notes: string[]
): Day => ({ id, week, phase, dayOfWeek, category, workoutLabel, setup, exercises, notes });
