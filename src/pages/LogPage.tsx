import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { byId, programForDay, DAY_LABEL } from '../plan';
import { HYROX_TYPES, INTENSITIES } from '../tags';
import { newId, saveLog, getLog, getWorkout, getActivePlans } from '../db';
import { formatWeight } from '../format';
import { buildSnapshot, customToSetup } from '../workouts';
import { useProfile } from '../profile';
import type {
  Category,
  DayOfWeek,
  Exercise,
  ExerciseLogEntry,
  Intensity,
  IntervalResult,
  UserPlan,
  WorkoutLog,
  WorkoutSetup,
  WorkoutSnapshot,
} from '../types';
import TimeInput from '../components/TimeInput';
import FeltPicker, { type Felt } from '../components/FeltPicker';
import { todayISO } from '../dateUtils';

// Normalized view over a library Day or a custom workout.
interface Target {
  id: string;
  isCustom: boolean;
  name: string;
  setup: WorkoutSetup;
  exercises: Exercise[];
  week?: number;
  dayOfWeek?: DayOfWeek;
  category?: Category;
}

export default function LogPage() {
  const { dayId, workoutId } = useParams<{ dayId?: string; workoutId?: string }>();
  const [searchParams] = useSearchParams();
  const editingId = searchParams.get('id') ?? undefined;
  const presetDate = searchParams.get('date') ?? undefined;
  const presetPlanId = searchParams.get('planId') ?? undefined;
  const nav = useNavigate();
  const { profile } = useProfile();
  const gender = profile?.gender;

  const [target, setTarget] = useState<Target | null>(null);
  const [snapshot, setSnapshot] = useState<WorkoutSnapshot | null>(null);
  const [resolving, setResolving] = useState(true);

  const [logId, setLogId] = useState<string>(() => editingId ?? newId());
  const [date, setDate] = useState(presetDate ?? todayISO());
  const [planId, setPlanId] = useState<string | undefined>(presetPlanId);
  const [activePlans, setActivePlans] = useState<UserPlan[]>([]);
  const [createdAt, setCreatedAt] = useState<number>(() => Date.now());
  const [totalTimeSec, setTotalTimeSec] = useState<number | undefined>();
  const [felt, setFelt] = useState<Felt | undefined>();
  const [intensity, setIntensity] = useState<Intensity | undefined>();
  const [notes, setNotes] = useState('');
  const [modifications, setModifications] = useState('');
  const [roundSplits, setRoundSplits] = useState<Record<number, number | undefined>>({});
  const [amrapFullRounds, setAmrapFullRounds] = useState<number | undefined>();
  const [amrapPartialReps, setAmrapPartialReps] = useState<number | undefined>();
  const [amrapCals, setAmrapCals] = useState<number | undefined>();
  const [perWindow, setPerWindow] = useState<Record<number, { fullRounds?: number; partialReps?: number; note?: string }>>({});
  const [intervalResults, setIntervalResults] = useState<Record<number, { reps?: number; cal?: number; valueSec?: number; note?: string }>>({});
  const [exerciseLogs, setExerciseLogs] = useState<Record<number, ExerciseLogEntry>>({});

  // Resolve the target (library day or custom workout) and, when editing, load
  // the existing log. Done in one async pass so exercise/result mapping uses the
  // resolved exercise list.
  useEffect(() => {
    let cancelled = false;
    async function run() {
      setResolving(true);
      const loaded = editingId ? await getLog(editingId) : null;

      // Resolve target. Prefer a custom log's snapshot so it works even if the
      // template was later edited or deleted.
      let t: Target | null = null;
      let snap: WorkoutSnapshot | null = null;
      if (loaded?.workoutSnapshot) {
        snap = loaded.workoutSnapshot;
        t = { id: loaded.workoutId ?? '', isCustom: true, name: snap.name, setup: snap.setup, exercises: snap.exercises };
      } else if (dayId || loaded?.dayId) {
        const d = byId(dayId ?? loaded!.dayId!);
        if (d) t = { id: d.id, isCustom: false, name: d.workoutLabel, setup: d.setup, exercises: d.exercises, week: d.week, dayOfWeek: d.dayOfWeek, category: d.category };
      } else if (workoutId) {
        const w = await getWorkout(workoutId);
        if (w) {
          const { setup, exercises } = customToSetup(w);
          t = { id: w.id, isCustom: true, name: w.name, setup, exercises };
          snap = buildSnapshot(w);
          if (!loaded) setIntensity(w.intensity);
        }
      }
      if (cancelled) return;

      const plans = await getActivePlans();
      if (cancelled) return;
      setActivePlans(plans);
      // Initial attribution: an existing log's plan, an explicit ?planId, or —
      // for a curated day whose program is committed — that program.
      let initialPlan = loaded?.planId ?? presetPlanId;
      const dayProgram = t && !t.isCustom ? programForDay(t.id) : undefined;
      if (!initialPlan && dayProgram && plans.some((p) => p.id === dayProgram.planId)) {
        initialPlan = dayProgram.planId;
      }
      setPlanId(initialPlan);

      const wgender = t?.isCustom ? undefined : gender;
      const exLogs: Record<number, ExerciseLogEntry> = {};
      t?.exercises.forEach((ex, i) => {
        if (ex.name.startsWith('—')) return;
        const def = ex.weight ? formatWeight(ex.weight, { gender: wgender }) : '';
        if (def) exLogs[i] = { exerciseName: ex.name, weightUsed: def };
      });

      if (loaded) {
        setLogId(loaded.id);
        setDate(loaded.date);
        setCreatedAt(loaded.createdAt);
        setTotalTimeSec(loaded.totalTimeSec);
        setFelt(loaded.feltLike);
        setIntensity(loaded.intensity);
        setNotes(loaded.notes ?? '');
        setModifications(loaded.modifications ?? '');
        if (loaded.roundSplits) {
          const o: Record<number, number | undefined> = {};
          loaded.roundSplits.forEach((r) => { o[r.roundIndex] = r.splitSec; });
          setRoundSplits(o);
        }
        if (loaded.amrap) {
          setAmrapFullRounds(loaded.amrap.fullRounds);
          setAmrapPartialReps(loaded.amrap.partialReps);
          setAmrapCals(loaded.amrap.totalCalories);
          if (loaded.amrap.perWindow) {
            const o: Record<number, { fullRounds?: number; partialReps?: number; note?: string }> = {};
            loaded.amrap.perWindow.forEach((w, i) => { o[i] = { fullRounds: w.fullRounds, partialReps: w.partialReps, note: w.note }; });
            setPerWindow(o);
          }
        }
        if (loaded.intervals?.splits) {
          const o: Record<number, { reps?: number; cal?: number; valueSec?: number; note?: string }> = {};
          loaded.intervals.splits.forEach((s) => { o[s.roundIndex] = { reps: s.reps, cal: s.cal, valueSec: s.valueSec, note: s.note }; });
          setIntervalResults(o);
        }
        if (loaded.exercises && t) {
          loaded.exercises.forEach((e) => {
            const idx = t!.exercises.findIndex((ex) => ex.name === e.exerciseName);
            if (idx >= 0) exLogs[idx] = e;
          });
        }
      }

      setExerciseLogs(exLogs);
      setTarget(t);
      setSnapshot(snap);
      setResolving(false);
    }
    run();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayId, workoutId, editingId]);

  if (resolving) {
    return <div className="p-4 text-muted text-sm">Loading…</div>;
  }

  if (!target) {
    return (
      <div className="p-4">
        <p>Workout not found.</p>
        <Link to="/" className="text-accent underline">Back home</Link>
      </div>
    );
  }

  async function save() {
    if (!target) return;
    const log: WorkoutLog = {
      id: logId,
      date,
      createdAt,
      status: 'logged',
      totalTimeSec,
      feltLike: felt,
      intensity,
      planId: planId || undefined,
      notes: notes || undefined,
      modifications: modifications || undefined,
    };
    if (target.isCustom) {
      log.workoutId = target.id || undefined;
      log.kind = 'custom';
      log.customName = target.name;
      if (snapshot) log.workoutSnapshot = snapshot;
    } else {
      log.dayId = target.id;
    }

    const setup = target.setup;
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
      .map(([k, v]) => ({ ...v, exerciseName: target.exercises[parseInt(k, 10)].name }));
    if (exerciseArr.length) log.exercises = exerciseArr;

    await saveLog(log);
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

  const setup = target.setup;
  const roundCount =
    setup.type === 'rft' || setup.type === 'descending_rounds' || setup.type === 'rounds'
      ? setup.rounds
      : 0;
  const intervalCount =
    setup.type === 'emom' ? setup.totalRounds : setup.type === 'intervals' ? setup.rounds : 0;

  return (
    <div className="pb-32">
      <div className="px-4 pt-3 pb-3 border-b border-line">
        {target.isCustom ? (
          <button onClick={() => nav(-1)} className="text-muted text-xs">← Back</button>
        ) : (
          <Link to={`/plan/${target.id}`} className="text-muted text-xs">← Back</Link>
        )}
        <div className="mt-2 font-display text-xl">
          {editingId ? 'Edit log' : 'Log workout'}
        </div>
        <div className="mt-1 text-sm text-white/80 truncate">
          {target.isCustom ? (
            <>{target.name}</>
          ) : (
            <>
              W{target.week} {target.dayOfWeek && DAY_LABEL[target.dayOfWeek]} ·{' '}
              {target.category && <span style={{ color: HYROX_TYPES[target.category].color }}>{HYROX_TYPES[target.category].name}</span>}
              {' · '}{target.name}
            </>
          )}
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

        <div>
          <label className="text-xs uppercase tracking-widest text-muted">Intensity</label>
          <div className="mt-1 flex gap-2">
            {INTENSITIES.map((it) => (
              <button
                key={it.value}
                onClick={() => setIntensity(intensity === it.value ? undefined : it.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider border ${
                  intensity === it.value ? 'bg-accent text-bg border-accent' : 'bg-transparent text-muted border-line'
                }`}
              >
                {it.label}
              </button>
            ))}
          </div>
        </div>

        {activePlans.length > 0 && (
          <div>
            <label className="text-xs uppercase tracking-widest text-muted">Part of a plan?</label>
            <select
              value={planId ?? ''}
              onChange={(e) => setPlanId(e.target.value || undefined)}
              className="block mt-1 bg-panel rounded px-3 py-2 w-full text-sm"
            >
              <option value="">Not part of a plan</option>
              {activePlans.map((p) => (
                <option key={p.id} value={p.id}>{p.icon ? `${p.icon} ` : ''}{p.name}</option>
              ))}
            </select>
          </div>
        )}

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

      {/* Per-exercise weights (pre-filled from the workout) */}
      <section className="px-4 pt-6">
        <div className="text-xs uppercase tracking-widest text-accent">Weights used</div>
        <div className="text-xs text-muted mt-1">Pre-filled with the prescribed weight — edit if you used something else</div>
        <div className="mt-2 space-y-2">
          {target.exercises.map((ex, i) => {
            if (ex.name.startsWith('—')) return null;
            return (
              <div key={i} className="bg-panel rounded p-2">
                <div className="text-sm">{ex.name}</div>
                <input
                  className="mt-1 w-full bg-panel2 rounded px-2 py-1.5 text-sm"
                  placeholder={ex.weight ? formatWeight(ex.weight, { gender: target.isCustom ? undefined : gender }) : 'Bodyweight / N/A'}
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
