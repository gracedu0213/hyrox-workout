import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { deleteWorkout, getWorkout, newId, saveLog } from '../db';
import { formatQty, formatSec } from '../format';
import { buildSnapshot, formatSingleWeight, isExercise, isRest } from '../workouts';
import { todayISO } from '../dateUtils';
import MoreMenu from '../components/MoreMenu';
import type { CustomWorkout, ExSpec, WorkoutLog } from '../types';

const INTENSITY_DOT: Record<string, string> = {
  easy: '#4ade80',
  moderate: '#fbbf24',
  hard: '#f87171',
};

// One exercise row: movement name on the left, prescription (reps/distance/time
// + weight) right-aligned so the page reads like a programming sheet.
function ExerciseRow({ ex }: { ex: ExSpec }) {
  const qty = formatQty({ name: ex.name, qty: ex.qty, unit: ex.unit });
  const weight = formatSingleWeight(ex.weight);
  const prescription = [qty, weight].filter(Boolean).join(' · ');
  return (
    <li className="flex items-baseline justify-between gap-3 py-2 border-b border-line/40 last:border-0">
      <span className="min-w-0">
        <span className="text-white/90">{ex.name}</span>
        {ex.note && <span className="block text-xs text-muted mt-0.5">{ex.note}</span>}
      </span>
      {prescription && (
        <span className="text-accent font-semibold tabular-nums shrink-0">{prescription}</span>
      )}
    </li>
  );
}

// Read-only detail view of a custom workout template (the Plan tab's "see the
// workout" surface). Logging happens here or from the Train tab — not from the
// browse list.
export default function WorkoutDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  // Carried in from the Plan tab so logging/scheduling from here stays attributed
  // to the plan (and its scheduled date).
  const planId = searchParams.get('planId') ?? undefined;
  const presetDate = searchParams.get('date') ?? undefined;
  const nav = useNavigate();
  const [workout, setWorkout] = useState<CustomWorkout | null | undefined>(undefined);
  const [scheduling, setScheduling] = useState(false);
  const [scheduleDate, setScheduleDate] = useState(presetDate ?? todayISO());

  useEffect(() => {
    if (!id) return;
    getWorkout(id).then((w) => setWorkout(w ?? null));
  }, [id]);

  if (workout === undefined) return <div className="p-4 text-muted text-sm">Loading…</div>;
  if (workout === null) {
    return (
      <div className="px-4 pt-6">
        <Link to="/plan" className="text-sm text-accent">← Plan</Link>
        <p className="text-muted mt-6">Workout not found.</p>
      </div>
    );
  }

  const workBlocks = workout.blocks.filter((b) => b.rows.some(isExercise));

  const logParams = new URLSearchParams();
  if (planId) logParams.set('planId', planId);
  if (presetDate) logParams.set('date', presetDate);
  const logQuery = logParams.toString() ? `?${logParams}` : '';

  async function remove() {
    if (!workout) return;
    if (!window.confirm(`Delete "${workout.name}"? Past logs are kept.`)) return;
    await deleteWorkout(workout.id);
    nav('/plan');
  }

  async function schedule() {
    if (!workout) return;
    const log: WorkoutLog = {
      id: newId(),
      workoutId: workout.id,
      kind: 'custom',
      customName: workout.name,
      intensity: workout.intensity,
      workoutSnapshot: buildSnapshot(workout),
      date: scheduleDate,
      createdAt: Date.now(),
      status: 'planned',
      planId,
    };
    await saveLog(log);
    nav('/');
  }

  return (
    <div className="pb-32">
      <div className="px-4 pt-3 pb-3 border-b border-line">
        <button onClick={() => nav(-1)} className="text-muted text-xs">← Back</button>
        <div className="flex items-start justify-between gap-3 mt-2">
          <div className="min-w-0">
            <h1 className="font-display text-3xl leading-tight tracking-[-0.02em] truncate">{workout.name}</h1>
            {workout.intensity && (
              <div className="mt-2">
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-panel2 text-[11px] uppercase tracking-wider text-muted">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: INTENSITY_DOT[workout.intensity] }} />
                  {workout.intensity}
                </span>
              </div>
            )}
          </div>
          <MoreMenu
            items={[
              { label: 'Edit', to: `/workout/${workout.id}/edit` },
              { label: 'Delete', destructive: true, onClick: remove },
            ]}
          />
        </div>
      </div>

      <section className="px-4 pt-5 space-y-3">
        {workout.blocks.map((block, i) => {
          // Standalone rest (rest once between work blocks) → full-width divider.
          if (!block.rows.some(isExercise)) {
            const rest = block.rows.find(isRest);
            return (
              <div key={i} className="flex items-center gap-3 px-1 py-0.5">
                <div className="h-px flex-1 bg-line" />
                <span className="text-[11px] uppercase tracking-widest text-muted">
                  Rest{rest?.restSec ? ` ${formatSec(rest.restSec)}` : ''}
                </span>
                <div className="h-px flex-1 bg-line" />
              </div>
            );
          }
          const rounds = Math.max(1, block.repeat || 1);
          // Number unlabeled blocks only when there's more than one work block;
          // a lone block just reads "Workout".
          const myWorkNo = workBlocks.indexOf(block) + 1;
          const heading = block.label || (workBlocks.length > 1 ? `Block ${myWorkNo}` : 'Workout');
          return (
            <div key={i} className="bg-panel rounded-xl p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs uppercase tracking-widest text-accent">
                  {heading}
                </span>
                {rounds > 1 && (
                  <span className="text-[11px] font-black uppercase tracking-widest text-bg bg-accent rounded-full px-2 py-0.5">
                    ×{rounds} rounds
                  </span>
                )}
              </div>
              <ul className="text-sm">
                {block.rows.map((row, j) =>
                  isRest(row) ? (
                    <li key={j} className="flex items-center gap-3 py-2 border-b border-line/40 last:border-0">
                      <div className="h-px flex-1 bg-line/50" />
                      <span className="text-[11px] uppercase tracking-widest text-muted">Rest {formatSec(row.restSec)}</span>
                      <div className="h-px flex-1 bg-line/50" />
                    </li>
                  ) : (
                    <ExerciseRow key={j} ex={row} />
                  ),
                )}
              </ul>
            </div>
          );
        })}
      </section>

      {workout.notes.length > 0 && (
        <section className="px-4 pt-6">
          <div className="text-xs uppercase tracking-widest text-muted mb-2">Notes</div>
          <ul className="space-y-1 text-sm text-white/85">
            {workout.notes.map((n, i) => <li key={i}>• {n}</li>)}
          </ul>
        </section>
      )}

      {scheduling && (
        <section className="px-4 pt-6">
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={scheduleDate}
              onChange={(e) => setScheduleDate(e.target.value)}
              className="flex-1 bg-panel2 rounded px-3 py-2 text-sm"
            />
            <button
              onClick={schedule}
              className="px-4 py-2 rounded bg-accent text-bg text-sm font-semibold uppercase tracking-wider"
            >
              Add
            </button>
          </div>
        </section>
      )}

      <div className="fixed bottom-[calc(env(safe-area-inset-bottom)+56px)] left-0 right-0 bg-bg border-t border-line p-3 flex gap-2">
        <Link
          to={`/workout/${workout.id}/log${logQuery}`}
          className="flex-1 text-center bg-accent text-bg rounded-lg py-3 font-semibold uppercase tracking-wider"
        >
          Log this workout
        </Link>
        <button
          onClick={() => setScheduling((s) => !s)}
          className="px-4 rounded-lg border border-line text-sm uppercase tracking-wider text-muted"
        >
          {scheduling ? 'Cancel' : 'Schedule'}
        </button>
      </div>
    </div>
  );
}
