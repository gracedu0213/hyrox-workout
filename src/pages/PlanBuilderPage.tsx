import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { getCustomWorkouts, getPlan, newId, savePlan } from '../db';
import { DAY_LABEL, WEEKDAYS_7 } from '../plan';
import { anytimeSlots, slotForDay, withDaySlot } from '../plans';
import type { CustomWorkout, DayOfWeek, PlanContent, PlanSlot, PlanWeek, UserPlan } from '../types';

const COLORS = ['#FF6B6B', '#FFD500', '#5BC0EB', '#9B59B6', '#2ECC71', '#FF9B5C', '#E84393'];

// Sentinel <option> value: picking it launches the workout builder instead of
// selecting an existing workout.
const NEW_WORKOUT = '__new__';

// Builder-only descriptor of a plan's shape. The stored UserPlan derives its
// shape from `content`/`goalPerWeek`; `PlanKind` just drives which editor shows.
type PlanKind = 'cadence' | 'schedule' | 'flexible';

const KIND_META: Record<PlanKind, { icon: string; title: string; blurb: string }> = {
  cadence: { icon: '🔥', title: 'Cadence goal', blurb: 'Train X times a week' },
  schedule: { icon: '📅', title: 'Weekly schedule', blurb: 'Pin workouts to days' },
  flexible: { icon: '📋', title: 'Flexible list', blurb: 'Workouts, any day' },
};

function emptyWeek(): PlanWeek {
  return { slots: [] };
}

// Recover the editor shape from a stored plan when editing.
function deriveKind(p: UserPlan): PlanKind {
  if (p.content?.type === 'pool') return 'cadence';
  if (p.content?.type === 'sequenced') {
    const dayed = p.content.weeks.some((w) => w.slots.some((s) => s.dayOfWeek));
    return dayed ? 'schedule' : 'flexible';
  }
  return 'cadence';
}

export default function PlanBuilderPage() {
  const { planId: editingId } = useParams<{ planId: string }>();
  const nav = useNavigate();
  // `kind` round-trips through the URL when we bounce out to create a workout,
  // so an empty draft comes back as the same shape the user was building.
  const [params] = useSearchParams();
  const kindParam = params.get('kind') as PlanKind | null;

  const [loaded, setLoaded] = useState(!editingId);
  const [id] = useState(() => editingId ?? newId());
  const [createdAt, setCreatedAt] = useState(() => Date.now());
  const [active, setActive] = useState(false);
  const [curatedContent, setCuratedContent] = useState(false);
  // null on a new plan => show the type chooser first.
  const [kind, setKind] = useState<PlanKind | null>(editingId ? (kindParam ?? 'cadence') : null);
  const [name, setName] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [icon, setIcon] = useState('');
  const [goalPerWeek, setGoalPerWeek] = useState<number | undefined>();
  // Cadence duration: `ongoing` true => no end; otherwise runs `durationWeeks`.
  const [ongoing, setOngoing] = useState(true);
  const [durationWeeks, setDurationWeeks] = useState<number | undefined>(8);
  const [startDate, setStartDate] = useState('');
  const [weeks, setWeeks] = useState<PlanWeek[]>([emptyWeek()]);

  const [workouts, setWorkouts] = useState<CustomWorkout[]>([]);

  useEffect(() => { getCustomWorkouts().then(setWorkouts); }, []);

  useEffect(() => {
    if (!editingId) return;
    getPlan(editingId).then((p) => {
      if (!p) { setLoaded(true); return; }
      setCreatedAt(p.createdAt);
      setActive(p.active);
      setName(p.name);
      setColor(p.color);
      setIcon(p.icon ?? '');
      setGoalPerWeek(p.goalPerWeek);
      setOngoing(p.durationWeeks == null);
      if (p.durationWeeks != null) setDurationWeeks(p.durationWeeks);
      setStartDate(p.startDate ?? '');
      setKind(kindParam ?? deriveKind(p));
      if (p.content?.type === 'sequenced') setWeeks(p.content.weeks.length ? p.content.weeks : [emptyWeek()]);
      if (p.content?.type === 'pool') setWeeks([{ slots: p.content.slots }]);
      if (p.content?.type === 'curated') setCuratedContent(true);
      setLoaded(true);
    });
  }, [editingId]); // eslint-disable-line react-hooks/exhaustive-deps

  function updateWeek(weekIdx: number, fn: (w: PlanWeek) => PlanWeek) {
    setWeeks((prev) => prev.map((w, i) => (i === weekIdx ? fn(w) : w)));
  }
  function setDay(weekIdx: number, dow: DayOfWeek, slot: PlanSlot | undefined) {
    updateWeek(weekIdx, (w) => withDaySlot(w, dow, slot));
  }
  function addAnytime(weekIdx: number) {
    updateWeek(weekIdx, (w) => ({ slots: [...w.slots, { kind: 'workout', workoutId: '' }] }));
  }
  function setAnytime(weekIdx: number, n: number, workoutId: string) {
    updateWeek(weekIdx, (w) => {
      const target = anytimeSlots(w)[n];
      return { slots: w.slots.map((s) => (s === target ? { kind: 'workout', workoutId } : s)) };
    });
  }
  function removeAnytime(weekIdx: number, n: number) {
    updateWeek(weekIdx, (w) => {
      const target = anytimeSlots(w)[n];
      return { slots: w.slots.filter((s) => s !== target) };
    });
  }
  function addWeek() { setWeeks((p) => [...p, emptyWeek()]); }
  function removeWeek(i: number) { setWeeks((p) => p.filter((_, j) => j !== i)); }

  // Drop incomplete workout slots (an added row where no workout was picked).
  const cleanWeeks: PlanWeek[] = weeks.map((w) => ({
    slots: w.slots.filter((s) => s.kind === 'rest' || s.workoutId),
  }));
  const hasSlots = cleanWeeks.some((w) => w.slots.length > 0);
  const goalValid = goalPerWeek != null && goalPerWeek > 0;
  const canSave =
    name.trim().length > 0 &&
    (curatedContent || (kind === 'cadence' ? goalValid : hasSlots));

  function buildPlan(): UserPlan {
    const cadence = kind === 'cadence';
    const poolSlots = cleanWeeks[0]?.slots ?? [];
    let content: PlanContent | undefined;
    if (curatedContent) content = { type: 'curated' };
    else if (cadence) content = poolSlots.length ? { type: 'pool', slots: poolSlots } : undefined;
    else if (hasSlots) content = { type: 'sequenced', weeks: cleanWeeks };
    return {
      id,
      name: name.trim(),
      color,
      icon: icon.trim() || undefined,
      content,
      // Cadence is goal-driven (with an optional workout pool + duration);
      // structured plans don't carry a separate weekly target.
      goalPerWeek: cadence && goalValid ? goalPerWeek : undefined,
      durationWeeks: cadence && !ongoing && durationWeeks && durationWeeks > 0 ? durationWeeks : undefined,
      startDate: kind === 'schedule' && startDate ? startDate : undefined,
      active,
      createdAt,
    };
  }

  async function save() {
    if (!canSave) return;
    await savePlan(buildPlan());
    nav('/plan');
  }

  // Persist the in-progress plan as a draft, then jump to the workout builder so
  // a freshly created workout can be slotted in on return — no lost work.
  async function createNewWorkout() {
    await savePlan(buildPlan());
    const back = `/plan/${id}/edit?kind=${kind}`;
    nav(`/workout/new?returnTo=${encodeURIComponent(back)}`);
  }

  if (!loaded) return <div className="p-4 text-muted text-sm">Loading…</div>;

  // --- Step 1: pick a plan shape (new plans only) ---
  if (kind === null) {
    return (
      <div className="pb-32">
        <div className="px-4 pt-3 pb-3 border-b border-line">
          <Link to="/plan" className="text-muted text-xs">← Plans</Link>
          <div className="mt-2 font-display text-xl">Build a plan</div>
          <p className="text-sm text-muted mt-1">Pick a shape — you can change the details after.</p>
        </div>
        <div className="px-4 pt-4 space-y-3">
          {(Object.keys(KIND_META) as PlanKind[]).map((k) => {
            const meta = KIND_META[k];
            return (
              <button
                key={k}
                onClick={() => setKind(k)}
                className="w-full flex items-center gap-4 bg-panel rounded-xl p-4 text-left active:bg-panel2"
              >
                <span className="text-3xl leading-none">{meta.icon}</span>
                <span className="min-w-0">
                  <span className="block font-display text-lg leading-tight">{meta.title}</span>
                  <span className="block text-sm text-muted">{meta.blurb}</span>
                </span>
                <span className="ml-auto text-muted text-xl">›</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  const meta = KIND_META[kind];

  // Shared "pick a workout / make a new one" rows used by cadence + flexible.
  function anytimeRows(week: PlanWeek, wi: number) {
    return (
      <div className="space-y-1.5">
        {anytimeSlots(week).map((slot, n) => (
          <div key={n} className="flex items-center gap-2">
            <select
              value={slot.kind === 'workout' ? slot.workoutId : ''}
              onChange={(e) => {
                if (e.target.value === NEW_WORKOUT) createNewWorkout();
                else setAnytime(wi, n, e.target.value);
              }}
              className="flex-1 bg-panel2 rounded px-2 py-1.5 text-sm"
            >
              <option value="">— pick a workout —</option>
              {workouts.map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
              <option value={NEW_WORKOUT}>+ Create new workout…</option>
            </select>
            <button
              onClick={() => removeAnytime(wi, n)}
              className="text-muted text-lg leading-none px-1"
              aria-label="Remove"
            >×</button>
          </div>
        ))}
        <button onClick={() => addAnytime(wi)} className="text-accent text-sm mt-1.5">+ Add workout</button>
      </div>
    );
  }

  return (
    <div className="pb-32">
      <div className="px-4 pt-3 pb-3 border-b border-line">
        {editingId ? (
          <Link to="/plan" className="text-muted text-xs">← Plans</Link>
        ) : (
          <button onClick={() => setKind(null)} className="text-muted text-xs">← Plan type</button>
        )}
        <div className="mt-2 font-display text-xl flex items-center gap-2">
          <span>{meta.icon}</span>
          <span>{editingId ? 'Edit plan' : meta.title}</span>
        </div>
        {!editingId && <p className="text-sm text-muted mt-1">{meta.blurb}</p>}
      </div>

      <section className="px-4 pt-4 space-y-4">
        <div>
          <label className="text-xs uppercase tracking-widest text-muted">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="block mt-1 bg-panel rounded px-3 py-2 w-full"
            placeholder={kind === 'cadence' ? 'e.g. Run 5×/week' : 'e.g. Strength block'}
          />
        </div>

        <div className="flex gap-4">
          <div>
            <label className="text-xs uppercase tracking-widest text-muted">Color</label>
            <div className="mt-1 flex gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full ${color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-bg' : ''}`}
                  style={{ backgroundColor: c }}
                  aria-label={`Color ${c}`}
                />
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs uppercase tracking-widest text-muted">Icon</label>
            <input
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              maxLength={2}
              className="block mt-1 bg-panel rounded px-3 py-2 w-16 text-center text-lg"
              placeholder={meta.icon}
            />
          </div>
        </div>
      </section>

      {curatedContent ? (
        <section className="px-4 pt-6">
          <div className="text-xs uppercase tracking-widest text-accent">Content</div>
          <p className="text-sm text-muted mt-2">This is the curated 12-week program — its content is fixed.</p>
        </section>
      ) : kind === 'cadence' ? (
        <>
          <section className="px-4 pt-6 space-y-3">
            <div className="text-xs uppercase tracking-widest text-accent">Weekly goal</div>
            <div className="flex items-center gap-3">
              <input
                type="number"
                inputMode="numeric"
                value={goalPerWeek ?? ''}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  setGoalPerWeek(isNaN(v) ? undefined : v);
                }}
                className="bg-panel rounded px-3 py-2 w-20 text-center text-lg"
                placeholder="5"
              />
              <span className="text-sm text-muted">sessions / week</span>
            </div>
          </section>

          <section className="px-4 pt-6 space-y-2">
            <div className="text-xs uppercase tracking-widest text-accent">Duration</div>
            <div className="flex gap-2">
              <button
                onClick={() => setOngoing(true)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider border ${
                  ongoing ? 'bg-accent text-bg border-accent' : 'bg-transparent text-muted border-line'
                }`}
              >
                Ongoing
              </button>
              <button
                onClick={() => setOngoing(false)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider border ${
                  !ongoing ? 'bg-accent text-bg border-accent' : 'bg-transparent text-muted border-line'
                }`}
              >
                Fixed weeks
              </button>
            </div>
            {!ongoing && (
              <div className="flex items-center gap-3 pt-1">
                <input
                  type="number"
                  inputMode="numeric"
                  value={durationWeeks ?? ''}
                  onChange={(e) => {
                    const v = parseInt(e.target.value, 10);
                    setDurationWeeks(isNaN(v) ? undefined : v);
                  }}
                  className="bg-panel rounded px-3 py-2 w-20 text-center text-lg"
                  placeholder="8"
                />
                <span className="text-sm text-muted">weeks</span>
              </div>
            )}
          </section>

          <section className="px-4 pt-6 space-y-2">
            <div className="text-xs uppercase tracking-widest text-accent">Go-to workouts</div>
            <p className="text-xs text-muted">
              Optional — workouts you reach for to hit the goal. Log any of them, any day, to build your streak.
            </p>
            <div className="bg-panel rounded-lg p-3">{anytimeRows(weeks[0], 0)}</div>
          </section>
        </>
      ) : (
        <section className="px-4 pt-6 space-y-4">
          <div className="text-xs uppercase tracking-widest text-accent">
            {kind === 'schedule' ? 'Schedule' : 'Workouts'}
          </div>
          <p className="text-xs text-muted -mt-2">
            {kind === 'schedule'
              ? 'Pin a workout (or rest) to each day you train.'
              : 'List the workouts for the week — do them any day.'}
          </p>

          {kind === 'schedule' && (
            <div>
              <label className="text-xs uppercase tracking-widest text-muted">Start date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="block mt-1 bg-panel rounded px-3 py-2"
              />
              <p className="text-[10px] text-muted mt-1">Optional — pins weeks to real dates.</p>
            </div>
          )}

          {weeks.map((week, wi) => (
            <div key={wi} className="bg-panel rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold">Week {wi + 1}</span>
                {weeks.length > 1 && (
                  <button onClick={() => removeWeek(wi)} className="text-red-400 text-xs">Remove</button>
                )}
              </div>

              {kind === 'schedule' ? (
                <div className="space-y-1.5">
                  {WEEKDAYS_7.map((dow) => {
                    const slot = slotForDay(week, dow);
                    const value = !slot ? '' : slot.kind === 'rest' ? 'rest' : slot.workoutId;
                    return (
                      <div key={dow} className="flex items-center gap-2">
                        <span className="w-9 text-xs font-black uppercase tracking-widest text-muted shrink-0">
                          {DAY_LABEL[dow]}
                        </span>
                        <select
                          value={value}
                          onChange={(e) => {
                            const v = e.target.value;
                            if (v === '') setDay(wi, dow, undefined);
                            else if (v === 'rest') setDay(wi, dow, { kind: 'rest' });
                            else if (v === NEW_WORKOUT) createNewWorkout();
                            else setDay(wi, dow, { kind: 'workout', workoutId: v });
                          }}
                          className="flex-1 bg-panel2 rounded px-2 py-1.5 text-sm"
                        >
                          <option value="">—</option>
                          <option value="rest">🛌 Rest</option>
                          {workouts.map((w) => (
                            <option key={w.id} value={w.id}>{w.name}</option>
                          ))}
                          <option value={NEW_WORKOUT}>+ Create new workout…</option>
                        </select>
                      </div>
                    );
                  })}
                </div>
              ) : (
                anytimeRows(week, wi)
              )}
            </div>
          ))}
          <button onClick={addWeek} className="w-full border border-line rounded-lg py-2 text-sm text-muted">
            + Add week
          </button>
        </section>
      )}

      <div className="fixed bottom-[calc(env(safe-area-inset-bottom)+56px)] left-0 right-0 bg-bg border-t border-line p-3">
        <button
          onClick={save}
          disabled={!canSave}
          className="w-full bg-accent text-bg rounded-lg py-3 font-semibold uppercase tracking-wider disabled:opacity-40"
        >
          {editingId ? 'Save changes' : 'Save plan'}
        </button>
      </div>
    </div>
  );
}
