import { byId } from '../plan';
import { hasResults, logKind } from '../logSummary';
import { FELT_EMOJI } from './FeltPicker';
import type { Category, WorkoutLog } from '../types';

// Hex values matching tailwind.config.js — used inline because tailwind's JIT
// can't see dynamic classes derived from data.
export const CAT_HEX: Record<Category, string> = {
  FOUNDATION: '#F0E040',
  AEROBIC: '#5BC0EB',
  ENGINE: '#FF6B6B',
  POWER: '#9B59B6',
  COMPLETE: '#2ECC71',
};

export type CellState =
  | { variant: 'empty' }
  | { variant: 'logged-plan'; color: string; emoji: string }
  | { variant: 'logged-custom'; emoji: string }
  | { variant: 'rest' }
  | { variant: 'planned'; color: string };

// Default stamp when a workout was logged but no felt-rating was recorded —
// keeps the cell from feeling empty.
const DEFAULT_DONE_EMOJI = '💪';

export function cellState(logs: WorkoutLog[]): CellState {
  if (logs.length === 0) return { variant: 'empty' };
  // Priority: a logged workout always wins over a rest or planned marker on
  // the same day, so the cell shows the most meaningful state at a glance.
  const loggedPlan = logs.find((l) => logKind(l) === 'plan' && hasResults(l));
  if (loggedPlan) {
    const d = loggedPlan.dayId ? byId(loggedPlan.dayId) : undefined;
    const emoji = loggedPlan.feltLike ? FELT_EMOJI[loggedPlan.feltLike] : DEFAULT_DONE_EMOJI;
    return { variant: 'logged-plan', color: d ? CAT_HEX[d.category] : '#F0E040', emoji };
  }
  const loggedCustom = logs.find((l) => logKind(l) === 'custom' && hasResults(l));
  if (loggedCustom) {
    const emoji = loggedCustom.feltLike ? FELT_EMOJI[loggedCustom.feltLike] : DEFAULT_DONE_EMOJI;
    return { variant: 'logged-custom', emoji };
  }
  if (logs.find((l) => logKind(l) === 'rest')) {
    return { variant: 'rest' };
  }
  const plannedPlan = logs.find((l) => logKind(l) === 'plan' && !hasResults(l));
  if (plannedPlan) {
    const d = plannedPlan.dayId ? byId(plannedPlan.dayId) : undefined;
    return { variant: 'planned', color: d ? CAT_HEX[d.category] : '#F0E040' };
  }
  return { variant: 'empty' };
}

// Note: the day-cell renderer that used to live here was removed with the
// History month view. `cellState` now feeds the compact Overview heatmap.
