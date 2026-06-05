import { Link, useNavigate, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { byId, CATEGORY_COLOR, DAY_LABEL } from '../plan';
import { formatExercise, setupSummary } from '../format';
import { deleteLog, getLogsForDate, getLogsForDay, newId, saveLog, CURATED_PLAN_ID } from '../db';
import { hasResults, logKind, logSummary } from '../logSummary';
import { todayISO } from '../dateUtils';
import { useProfile } from '../profile';
import type { WorkoutLog } from '../types';

export default function DayPage() {
  const { dayId } = useParams<{ dayId: string }>();
  const day = dayId ? byId(dayId) : undefined;
  const [logs, setLogs] = useState<WorkoutLog[]>([]);
  const nav = useNavigate();
  const { profile } = useProfile();
  const gender = profile?.gender;

  async function refresh() {
    if (!dayId) return;
    setLogs(await getLogsForDay(dayId));
  }

  useEffect(() => { refresh(); }, [dayId]);

  const [scheduleDate, setScheduleDate] = useState<string>(todayISO());

  async function addToPlan() {
    if (!day || !scheduleDate) return;
    const existing = await getLogsForDate(scheduleDate);
    if (existing.length > 0) {
      const summary = existing.map(describeExistingLog).join('; ');
      const ok = window.confirm(
        `${scheduleDate} already has: ${summary}.\n\nAdd ${day.workoutLabel} on top?`
      );
      if (!ok) return;
    }
    const log: WorkoutLog = {
      id: newId(),
      dayId: day.id,
      date: scheduleDate,
      createdAt: Date.now(),
      status: 'planned',
    };
    await saveLog(log);
    nav(scheduleDate === todayISO() ? '/' : `/plan/program/${CURATED_PLAN_ID}?week=${day.week}`);
  }

  async function removeLog(id: string) {
    if (!window.confirm('Delete this planned workout?')) return;
    await deleteLog(id);
    refresh();
  }

  if (!day) {
    return (
      <div className="p-4">
        <p>Day not found.</p>
        <Link to="/plan" className="text-accent underline">Back to plan</Link>
      </div>
    );
  }

  return (
    <div>
      <div className="px-4 pt-3 pb-5 border-b border-line">
        <Link to={`/plan/program/${CURATED_PLAN_ID}?week=${day.week}`} className="text-muted text-xs">← Plan</Link>
        <div className="mt-2 flex items-baseline gap-2 flex-wrap">
          <span className="font-display text-3xl tracking-[-0.02em]">W{String(day.week).padStart(2, '0')} · {DAY_LABEL[day.dayOfWeek]}</span>
          <span className={`text-[10px] font-black uppercase tracking-widest text-${CATEGORY_COLOR[day.category]}`}>
            {day.category}
          </span>
        </div>
        <div className="mt-1 text-[10px] text-muted uppercase tracking-[0.25em] font-semibold">{day.phase}</div>
      </div>

      <section className="px-4 py-4 border-b border-line">
        <div className="text-xs uppercase tracking-widest text-accent">Workout</div>
        <div className="font-display text-xl mt-1">{day.workoutLabel}</div>
        <div className="text-sm text-muted mt-1">{setupSummary(day.setup)}</div>

        {day.setup.type === 'descending_rounds' && day.setup.roundDetails && (
          <ul className="mt-3 text-sm text-white/80 space-y-1">
            {day.setup.roundDetails.map((r, i) => <li key={i}>• {r}</li>)}
          </ul>
        )}
        {day.setup.type === 'multi_window_amrap' && (
          <ul className="mt-3 text-sm text-white/80 space-y-1">
            {day.setup.windows.map((w, i) => <li key={i}>• {w.label}</li>)}
          </ul>
        )}
      </section>

      <section className="px-4 py-4 border-b border-line">
        <div className="text-xs uppercase tracking-widest text-accent">Exercises</div>
        <ul className="mt-2 space-y-2">
          {day.exercises.map((ex, i) => {
            const isSep = ex.name.startsWith('—');
            return (
              <li
                key={i}
                className={
                  isSep
                    ? 'text-xs uppercase tracking-wider text-muted pt-2'
                    : 'bg-panel rounded-md px-3 py-2 text-sm'
                }
              >
                {formatExercise(ex, { gender })}
              </li>
            );
          })}
        </ul>
      </section>

      {day.notes.length > 0 && (
        <section className="px-4 py-4 border-b border-line">
          <div className="text-xs uppercase tracking-widest text-accent">Notes</div>
          <ul className="mt-2 space-y-1.5 text-sm text-white/80">
            {day.notes.map((n, i) => <li key={i}>• {n}</li>)}
          </ul>
        </section>
      )}

      <section className="px-4 py-4 border-b border-line">
        <div className="bg-panel rounded-lg p-3">
          <div className="text-xs uppercase tracking-widest text-muted">Add to plan</div>
          <div className="mt-2 flex items-center gap-2">
            <input
              type="date"
              value={scheduleDate}
              onChange={(e) => setScheduleDate(e.target.value)}
              className="flex-1 bg-panel2 rounded px-3 py-2 text-sm"
            />
            <button
              onClick={addToPlan}
              disabled={!scheduleDate}
              className="px-4 py-2 rounded bg-accent text-bg text-sm font-semibold uppercase tracking-wider disabled:opacity-40"
            >
              Add
            </button>
          </div>
          <p className="text-xs text-muted mt-2">Defaults to today. Pick any date — past or future — then log results from the day's entry.</p>
        </div>
      </section>

      <section className="px-4 py-4">
        <div className="text-xs uppercase tracking-widest text-accent">Your Logs ({logs.length})</div>
        {logs.length === 0 ? (
          <p className="mt-3 text-sm text-muted">No logs yet for this workout.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {logs.map((l) => {
              const planned = l.status === 'planned' && !hasResults(l);
              return (
                <li key={l.id} className="bg-panel rounded p-2 text-sm">
                  <div className="flex justify-between items-center">
                    <span>{l.date}</span>
                    {planned ? (
                      <span className="text-[10px] uppercase tracking-wider text-muted">Planned</span>
                    ) : (
                      <span
                        className="font-display text-base leading-none tracking-tight bg-clip-text text-transparent"
                        style={{ backgroundImage: 'linear-gradient(135deg, #FFD500 0%, #F0E040 35%, #FF9B5C 70%, #FF6B6B 100%)' }}
                      >
                        {logSummary(l) || 'Logged'}
                      </span>
                    )}
                  </div>
                  {l.notes && <div className="text-xs text-muted mt-1">{l.notes}</div>}
                  {l.modifications && <div className="text-xs text-muted mt-0.5 italic">Mod: {l.modifications}</div>}
                  <div className="mt-2 flex gap-2">
                    <Link
                      to={`/plan/${day.id}/log?id=${l.id}`}
                      className="text-xs px-2 py-1 rounded bg-panel2 text-accent"
                    >
                      {planned ? 'Add results' : 'Edit'}
                    </Link>
                    {planned && (
                      <button
                        onClick={() => removeLog(l.id)}
                        className="text-xs px-2 py-1 rounded bg-panel2 text-red-400"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function describeExistingLog(l: WorkoutLog): string {
  const kind = logKind(l);
  if (kind === 'rest') return 'a rest day';
  if (kind === 'custom') return `custom "${l.customName ?? 'workout'}"`;
  const d = l.dayId ? byId(l.dayId) : undefined;
  const label = d?.workoutLabel ?? 'a plan workout';
  const state = l.status === 'planned' && !hasResults(l) ? ' (planned)' : ' (logged)';
  return `${label}${state}`;
}
