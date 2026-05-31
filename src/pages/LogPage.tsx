import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { byId, DAY_LABEL, CATEGORY_COLOR } from '../plan';
import { newId, saveLog, getLog } from '../db';
import { formatWeight } from '../format';
import { useProfile } from '../profile';
import type { ExerciseLogEntry, IntervalResult, WorkoutLog } from '../types';
import TimeInput from '../components/TimeInput';
import FeltPicker, { type Felt } from '../components/FeltPicker';

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function LogPage() {
  const { dayId } = useParams<{ dayId: string }>();
  const [searchParams] = useSearchParams();
  const editingId = searchParams.get('id') ?? undefined;
  const day = dayId ? byId(dayId) : undefined;
  const nav = useNavigate();
  const { profile } = useProfile();
  const gender = profile?.gender;

  const [logId, setLogId] = useState<string>(() => editingId ?? newId());
  const [date, setDate] = useState(todayISO());
  const [createdAt, setCreatedAt] = useState<number>(() => Date.now());
  const [totalTimeSec, setTotalTimeSec] = useState<number | undefined>();
  const [felt, setFelt] = useState<Felt | undefined>();
  const [notes, setNotes] = useState('');
  const [modifications, setModifications] = useState('');
  const [roundSplits, setRoundSplits] = useState<Record<number, number | undefined>>({});
  const [amrapFullRounds, setAmrapFullRounds] = useState<number | undefined>();
  const [amrapPartialReps, setAmrapPartialReps] = useState<number | undefined>();
  const [amrapCals, setAmrapCals] = useState<number | undefined>();
  const [perWindow, setPerWindow] = useState<Record<number, { fullRounds?: number; partialReps?: number; note?: string }>>({});
  const [intervalResults, setIntervalResults] = useState<Record<number, { reps?: number; cal?: number; valueSec?: number; note?: string }>>({});
  const [exerciseLogs, setExerciseLogs] = useState<Record<number, ExerciseLogEntry>>({});

  // Initialize per-exercise weight defaults from the plan
  useEffect(() => {
    if (!day) return;
    setExerciseLogs((prev) => {
      // Only set defaults for entries that don't exist yet
      const next: Record<number, ExerciseLogEntry> = { ...prev };
      day.exercises.forEach((ex, i) => {
        if (ex.name.startsWith('—')) return;
        if (next[i]) return;
        const def = ex.weight ? formatWeight(ex.weight, { gender }) : '';
        if (def) next[i] = { exerciseName: ex.name, weightUsed: def };
      });
      return next;
    });
  }, [day, gender]);

  // Load existing log if editing
  useEffect(() => {
    if (!editingId) return;
    getLog(editingId).then((l) => {
      if (!l) return;
      setLogId(l.id);
      setDate(l.date);
      setCreatedAt(l.createdAt);
      setTotalTimeSec(l.totalTimeSec);
      setFelt(l.feltLike);
      setNotes(l.notes ?? '');
      setModifications(l.modifications ?? '');
      if (l.roundSplits) {
        const o: Record<number, number | undefined> = {};
        l.roundSplits.forEach((r) => { o[r.roundIndex] = r.splitSec; });
        setRoundSplits(o);
      }
      if (l.amrap) {
        setAmrapFullRounds(l.amrap.fullRounds);
        setAmrapPartialReps(l.amrap.partialReps);
        setAmrapCals(l.amrap.totalCalories);
        if (l.amrap.perWindow) {
          const o: Record<number, { fullRounds?: number; partialReps?: number; note?: string }> = {};
          l.amrap.perWindow.forEach((w, i) => { o[i] = { fullRounds: w.fullRounds, partialReps: w.partialReps, note: w.note }; });
          setPerWindow(o);
        }
      }
      if (l.intervals?.splits) {
        const o: Record<number, { reps?: number; cal?: number; valueSec?: number; note?: string }> = {};
        l.intervals.splits.forEach((s) => { o[s.roundIndex] = { reps: s.reps, cal: s.cal, valueSec: s.valueSec, note: s.note }; });
        setIntervalResults(o);
      }
      if (l.exercises && day) {
        // Match by exerciseName back to plan index
        const o: Record<number, ExerciseLogEntry> = {};
        l.exercises.forEach((e) => {
          const idx = day.exercises.findIndex((ex) => ex.name === e.exerciseName);
          if (idx >= 0) o[idx] = e;
        });
        setExerciseLogs((prev) => ({ ...prev, ...o }));
      }
    });
  }, [editingId, day]);

  if (!day) {
    return (
      <div className="p-4">
        <p>Day not found.</p>
        <Link to="/plan" className="text-accent underline">Back to plan</Link>
      </div>
    );
  }

  async function save() {
    if (!day) return;
    const log: WorkoutLog = {
      id: logId,
      dayId: day.id,
      date,
      createdAt,
      status: 'logged',
      totalTimeSec,
      feltLike: felt,
      notes: notes || undefined,
      modifications: modifications || undefined,
    };

    const setup = day.setup;
    if (setup.type === 'rft' || setup.type === 'descending_rounds' || setup.type === 'rounds') {
      const splits = Object.entries(roundSplits)
        .filter(([, v]) => v != null)
        .map(([k, v]) => ({ roundIndex: parseInt(k, 10), splitSec: v }));
      if (splits.length) log.roundSplits = splits;
    }
    if (setup.type === 'amrap') {
      if (amrapFullRounds != null || amrapPartialReps != null || amrapCals != null) {
        log.amrap = { fullRounds: amrapFullRounds, partialReps: amrapPartialReps, totalCalories: amrapCals };
      }
    }
    if (setup.type === 'multi_window_amrap') {
      const arr = setup.windows.map((w, i) => ({
        label: w.label,
        fullRounds: perWindow[i]?.fullRounds,
        partialReps: perWindow[i]?.partialReps,
        note: perWindow[i]?.note,
      }));
      if (arr.some((p) => p.fullRounds != null || p.partialReps != null || p.note)) {
        log.amrap = { perWindow: arr };
      }
    }
    if (setup.type === 'emom' || setup.type === 'intervals') {
      const splits = Object.entries(intervalResults)
        .filter(([, v]) => v.reps != null || v.cal != null || v.valueSec != null || v.note)
        .map(([k, v]) => ({ roundIndex: parseInt(k, 10), ...v }));
      if (splits.length) log.intervals = { splits } as IntervalResult;
    }
    const exerciseArr = Object.entries(exerciseLogs)
      .filter(([, v]) => v.weightUsed || v.repsCompleted != null || v.result)
      .map(([k, v]) => ({ ...v, exerciseName: day.exercises[parseInt(k, 10)].name }));
    if (exerciseArr.length) log.exercises = exerciseArr;

    await saveLog(log);
    // If we just transitioned from no-results to has-results, celebrate.
    const becameLogged =
      log.totalTimeSec != null ||
      !!log.roundSplits?.length ||
      !!log.amrap ||
      !!log.intervals?.splits?.length ||
      !!log.exercises?.length ||
      !!log.feltLike ||
      !!log.notes;
    nav(`/log/${log.id}${becameLogged ? '?celebrate=1' : ''}`);
  }

  const setup = day.setup;
  const roundCount =
    setup.type === 'rft' || setup.type === 'descending_rounds' || setup.type === 'rounds'
      ? setup.rounds
      : 0;
  const intervalCount =
    setup.type === 'emom' ? setup.totalRounds : setup.type === 'intervals' ? setup.rounds : 0;

  return (
    <div className="pb-32">
      <div className="px-4 pt-3 pb-3 border-b border-line">
        <Link to={`/plan/${day.id}`} className="text-muted text-xs">← Back</Link>
        <div className="mt-2 font-display text-xl">
          {editingId ? 'Edit log' : 'Log workout'}
        </div>
        <div className="mt-1 text-sm text-white/80 truncate">
          W{day.week} {DAY_LABEL[day.dayOfWeek]} ·{' '}
          <span className={`text-${CATEGORY_COLOR[day.category]}`}>{day.category}</span>
          {' · '}{day.workoutLabel}
        </div>
      </div>

      <section className="px-4 pt-4 space-y-4">
        <div>
          <label className="text-xs uppercase tracking-widest text-muted">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="block mt-1 bg-panel rounded px-3 py-2 w-full"
          />
        </div>

        <div>
          <label className="text-xs uppercase tracking-widest text-muted">Total time</label>
          <div className="mt-1">
            <TimeInput valueSec={totalTimeSec} onChange={setTotalTimeSec} placeholder />
          </div>
        </div>

        <FeltPicker value={felt} onChange={setFelt} />
      </section>

      {/* Per-round splits */}
      {roundCount > 0 && (
        <section className="px-4 pt-6">
          <div className="text-xs uppercase tracking-widest text-accent">Round splits</div>
          <div className="text-xs text-muted mt-1">Time at end of each round (optional)</div>
          <div className="mt-2 space-y-2">
            {Array.from({ length: roundCount }, (_, i) => (
              <div key={i} className="flex items-center justify-between bg-panel rounded px-3 py-2">
                <span className="text-sm">Round {i + 1}</span>
                <TimeInput
                  valueSec={roundSplits[i]}
                  onChange={(v) => setRoundSplits((p) => ({ ...p, [i]: v }))}
                  placeholder
                  compact
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* AMRAP */}
      {setup.type === 'amrap' && (
        <section className="px-4 pt-6">
          <div className="text-xs uppercase tracking-widest text-accent">AMRAP result</div>
          <div className="mt-2 grid grid-cols-3 gap-2">
            <NumberField label="Rounds" value={amrapFullRounds} onChange={setAmrapFullRounds} />
            <NumberField label="+ Reps" value={amrapPartialReps} onChange={setAmrapPartialReps} />
            <NumberField label="Cals" value={amrapCals} onChange={setAmrapCals} />
          </div>
        </section>
      )}

      {/* Multi-window AMRAP */}
      {setup.type === 'multi_window_amrap' && (
        <section className="px-4 pt-6">
          <div className="text-xs uppercase tracking-widest text-accent">Per window</div>
          <div className="mt-2 space-y-3">
            {setup.windows.map((w, i) => (
              <div key={i} className="bg-panel rounded p-3">
                <div className="text-sm font-semibold">{w.label}</div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <NumberField
                    label="Rounds"
                    value={perWindow[i]?.fullRounds}
                    onChange={(v) => setPerWindow((p) => ({ ...p, [i]: { ...p[i], fullRounds: v } }))}
                  />
                  <NumberField
                    label="+ Reps"
                    value={perWindow[i]?.partialReps}
                    onChange={(v) => setPerWindow((p) => ({ ...p, [i]: { ...p[i], partialReps: v } }))}
                  />
                </div>
                <input
                  placeholder="Notes for this window"
                  className="mt-2 w-full bg-panel2 rounded px-2 py-1.5 text-sm"
                  value={perWindow[i]?.note ?? ''}
                  onChange={(e) => setPerWindow((p) => ({ ...p, [i]: { ...p[i], note: e.target.value } }))}
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* EMOM / intervals */}
      {intervalCount > 0 && (
        <section className="px-4 pt-6">
          <div className="text-xs uppercase tracking-widest text-accent">Per interval</div>
          <div className="text-xs text-muted mt-1">Reps, cals, or split time per interval</div>
          <div className="mt-2 space-y-2">
            {Array.from({ length: intervalCount }, (_, i) => (
              <div key={i} className="bg-panel rounded p-2">
                <div className="text-xs font-semibold mb-1">Interval {i + 1}</div>
                <div className="grid grid-cols-3 gap-2">
                  <NumberField
                    label="Reps"
                    value={intervalResults[i]?.reps}
                    onChange={(v) => setIntervalResults((p) => ({ ...p, [i]: { ...p[i], reps: v } }))}
                  />
                  <NumberField
                    label="Cals"
                    value={intervalResults[i]?.cal}
                    onChange={(v) => setIntervalResults((p) => ({ ...p, [i]: { ...p[i], cal: v } }))}
                  />
                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-muted">Split</label>
                    <div className="mt-1">
                      <TimeInput
                        compact
                        placeholder
                        valueSec={intervalResults[i]?.valueSec}
                        onChange={(v) => setIntervalResults((p) => ({ ...p, [i]: { ...p[i], valueSec: v } }))}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Per-exercise weights (pre-filled from plan) */}
      <section className="px-4 pt-6">
        <div className="text-xs uppercase tracking-widest text-accent">Weights used</div>
        <div className="text-xs text-muted mt-1">Pre-filled with the plan's prescribed weight — edit if you used something else</div>
        <div className="mt-2 space-y-2">
          {day.exercises.map((ex, i) => {
            if (ex.name.startsWith('—')) return null;
            return (
              <div key={i} className="bg-panel rounded p-2">
                <div className="text-sm">{ex.name}</div>
                <input
                  className="mt-1 w-full bg-panel2 rounded px-2 py-1.5 text-sm"
                  placeholder={ex.weight ? formatWeight(ex.weight, { gender }) : 'Bodyweight / N/A'}
                  value={exerciseLogs[i]?.weightUsed ?? ''}
                  onChange={(e) =>
                    setExerciseLogs((p) => ({
                      ...p,
                      [i]: { ...p[i], exerciseName: ex.name, weightUsed: e.target.value },
                    }))
                  }
                />
              </div>
            );
          })}
        </div>
      </section>

      <section className="px-4 pt-6 space-y-3">
        <div>
          <label className="text-xs uppercase tracking-widest text-muted">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="mt-1 w-full bg-panel rounded px-3 py-2 text-sm"
            placeholder="How did it feel? Anything notable?"
          />
        </div>
        <div>
          <label className="text-xs uppercase tracking-widest text-muted">Modifications</label>
          <textarea
            value={modifications}
            onChange={(e) => setModifications(e.target.value)}
            rows={2}
            className="mt-1 w-full bg-panel rounded px-3 py-2 text-sm"
            placeholder="What did you swap or adjust?"
          />
        </div>
      </section>

      <div className="fixed bottom-[calc(env(safe-area-inset-bottom)+56px)] left-0 right-0 bg-bg border-t border-line p-3">
        <button
          onClick={save}
          className="w-full bg-accent text-bg rounded-lg py-3 font-semibold uppercase tracking-wider"
        >
          {editingId ? 'Save changes' : 'Save log'}
        </button>
      </div>
    </div>
  );
}

function NumberField({ label, value, onChange }: { label: string; value?: number; onChange: (n?: number) => void }) {
  return (
    <div>
      <label className="text-[10px] uppercase tracking-wider text-muted">{label}</label>
      <input
        type="number"
        inputMode="numeric"
        pattern="[0-9]*"
        className="mt-1 block w-full bg-panel2 rounded px-2 py-1.5 text-center"
        value={value ?? ''}
        onChange={(e) => {
          const v = e.target.value;
          if (v === '') onChange(undefined);
          else {
            const n = parseInt(v, 10);
            onChange(isNaN(n) ? undefined : n);
          }
        }}
      />
    </div>
  );
}
