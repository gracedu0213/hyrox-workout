import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getCustomWorkouts } from '../db';
import { setupSummary } from '../format';
import { customToSetup } from '../workouts';
import { poolSlots } from '../plans';
import type { CustomWorkout, UserPlan } from '../types';

// Bottom sheet for logging a session toward a cadence plan: its go-to pool as
// one-tap log targets, each tagged to the plan. Shown when a cadence plan has
// 2+ pool workouts (single → logged directly; empty → opens the plan page).
export default function CadenceLogSheet({ plan, onClose }: { plan: UserPlan; onClose: () => void }) {
  const [workouts, setWorkouts] = useState<Map<string, CustomWorkout>>(new Map());
  useEffect(() => {
    getCustomWorkouts().then((ws) => setWorkouts(new Map(ws.map((w) => [w.id, w]))));
  }, []);

  // Prefer the plan's go-to pool; if it has none, fall back to all custom
  // workouts so a cadence plan is always loggable.
  const poolIds = poolSlots(plan).flatMap((s) => (s.kind === 'workout' ? [s.workoutId] : []));
  const targets: CustomWorkout[] = poolIds.length
    ? poolIds.map((id) => workouts.get(id)).filter((w): w is CustomWorkout => !!w)
    : [...workouts.values()];

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="relative bg-panel rounded-t-2xl p-4 pb-[calc(env(safe-area-inset-bottom)+16px)] max-h-[75vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 mb-1">
          {plan.icon && <span className="text-lg">{plan.icon}</span>}
          <div className="font-display text-lg leading-tight">Log toward {plan.name}</div>
        </div>
        {poolIds.length === 0 && (
          <p className="text-xs text-muted mb-3">Pick any workout — it'll count toward this plan.</p>
        )}

        {targets.length === 0 ? (
          <p className="text-sm text-muted py-2">
            No workouts yet. <Link to="/workout/new" onClick={onClose} className="text-accent">Build one →</Link>
          </p>
        ) : (
          <ul className="space-y-2 mt-2">
            {targets.map((w) => (
              <li key={w.id}>
                <Link
                  to={`/workout/${w.id}/log?planId=${plan.id}`}
                  onClick={onClose}
                  className="flex items-center justify-between gap-3 bg-panel2 rounded-lg p-3 active:opacity-80"
                >
                  <div className="min-w-0">
                    <div className="font-semibold text-sm truncate">{w.name}</div>
                    <div className="text-xs text-muted truncate">{setupSummary(customToSetup(w).setup)}</div>
                  </div>
                  <span className="text-xs font-black uppercase tracking-widest text-accent shrink-0">Log →</span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        <Link
          to={`/plan/program/${plan.id}`}
          onClick={onClose}
          className="block text-center text-xs text-muted mt-3 py-1"
        >
          View plan details
        </Link>
      </div>
    </div>
  );
}
