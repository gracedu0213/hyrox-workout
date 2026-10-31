import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { byId, curatedProgram, programForDay, DAY_LABEL, WEEKDAYS_7, type CuratedProgram } from '../plan';
import { HYROX_TYPES } from '../tags';
import { setupSummary } from '../format';
import { customToSetup } from '../workouts';
import { getAllLogs, getCustomWorkouts, getPlan, savePlan, archivePlan } from '../db';
import { hasResults, logKind } from '../logSummary';
import { todayISO, isoDate, mondayOfWeek } from '../dateUtils';
import { curatedDescriptor, isCurated, isCadence, poolSlots, slotForDay, anytimeSlots } from '../plans';
import MoreMenu, { type MenuItem } from '../components/MoreMenu';
import ConsistencyHeatmap from '../components/ConsistencyHeatmap';
import { useLogTypeResolver } from '../logTypeColor';
import { weekProgress, computeStreak, isQualifying } from '../planStats';
import type { CustomWorkout, Day, Phase, UserPlan, WorkoutLog } from '../types';

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatShortDate(iso: string): string {
  const [, m, d] = iso.split('-').map(Number);
  if (!m || !d) return iso;
  return `${MONTH_SHORT[m - 1]} ${d}`;
}

const PHASE_LABEL: Record<Phase, string> = {
  BASE: 'BASE', PACE: 'PACE', ACCELERATE: 'ACCELERATE', PRIME: 'PRIME', RACE: 'RACE',
};

export default function ProgramPage() {
  const { planId } = useParams<{ planId: string }>();
  const nav = useNavigate();
  const [plan, setPlan] = useState<UserPlan | null>(null);
  const [logs, setLogs] = useState<WorkoutLog[]>([]);
  const [notFound, setNotFound] = useState(false);

  async function refresh() {
    const all = await getAllLogs();
    setLogs(all);
    if (!planId) { setNotFound(true); return; }
    const row = await getPlan(planId);
    const program = curatedProgram(planId);
    if (row) setPlan(row);
    else if (program) setPlan(curatedDescriptor(program));
    else setNotFound(true);
  }

  useEffect(() => { refresh(); /* eslint-disable-line */ }, [planId]);

  if (notFound) {
    return (
      <div className="px-4 pt-6">
        <Link to="/plan" className="text-sm text-accent">← Plans</Link>
        <p className="text-muted mt-6">Plan not found.</p>
      </div>
    );
  }
  if (!plan) return null;

  async function commit(active: boolean) {
    if (!plan) return;
    const next: UserPlan = {
      ...plan,
      active,
      createdAt: plan.createdAt || Date.now(),
    };
    await savePlan(next);
    await refresh();
  }

  async function remove() {
    if (!plan || isCurated(plan)) return;
    if (!window.confirm(`Delete "${plan.name}"? Your logged sessions are kept.`)) return;
    await archivePlan(plan.id);
    nav('/plan');
  }

  const program = curatedProgram(plan.id);
  const planLogs = logs.filter((l) => l.planId === plan.id);
  const progress = weekProgress(planLogs, plan);
  const streak = computeStreak(planLogs, plan);

  // Active state is now explicit via this menu rather than a toggling badge.
  const menuItems: MenuItem[] = [];
  if (!isCurated(plan)) menuItems.push({ label: 'Edit plan', to: `/plan/${plan.id}/edit` });
  if (plan.active) menuItems.push({ label: 'Make inactive', onClick: () => commit(false) });
  if (!isCurated(plan)) menuItems.push({ label: 'Delete plan', destructive: true, onClick: remove });

  return (
    <div className="pb-8">
      <header className="px-4 pt-5">
        <Link to="/plan" className="text-sm text-accent">← Plans</Link>
        <div className="flex items-start justify-between mt-2 gap-3">
          <div className="min-w-0">
            <h1 className="font-display text-3xl leading-[0.95] tracking-[-0.02em] flex items-center gap-2">
              {plan.icon && <span className="text-2xl">{plan.icon}</span>}
              <span className="truncate">{plan.name}</span>
            </h1>
            <div className="mt-1 flex items-center gap-3 text-xs text-muted">
              {plan.goalPerWeek != null && (
                <span>
                  <span className="text-accent font-semibold">{progress.done}</span>
                  /{plan.goalPerWeek} this week
                </span>
              )}
              {streak > 0 && <span>🔥 {streak}wk streak</span>}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {plan.active ? (
              <span className="px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-widest bg-panel2 text-muted">
                Active ✓
              </span>
            ) : (
              <button
                onClick={() => commit(true)}
                className="px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-widest"
                style={{ backgroundColor: plan.color, color: '#0a0a0a' }}
              >
                Start
              </button>
            )}
            {menuItems.length > 0 && <MoreMenu items={menuItems} />}
          </div>
        </div>
      </header>

      {program
        ? <CuratedBody program={program} logs={logs} planActive={plan.active} />
        : isCadence(plan)
          ? <CadenceBody plan={plan} logs={planLogs} />
          : <SequencedBody plan={plan} logs={planLogs} />}
    </div>
  );
}

// ---- Curated 12-week (the original week-strip view, unchanged) ----

function CuratedBody({ program, logs: allLogs, planActive }: { program: CuratedProgram; logs: WorkoutLog[]; planActive: boolean }) {
  // Only this program's days: completion, upcoming, and the latest-week jump
  // must not pick up sessions from the other curated program.
  const logs = useMemo(
    () => allLogs.filter((l) => l.dayId && programForDay(l.dayId) === program),
    [allLogs, program],
  );
  const weeks = useMemo(() => {
    const map = new Map<number, Day[]>();
    for (const d of program.plan.days) {
      if (!map.has(d.week)) map.set(d.week, []);
      map.get(d.week)!.push(d);
    }
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
  }, [program]);

  const [searchParams, setSearchParams] = useSearchParams();
  const urlWeek = Number(searchParams.get('week')) || 0;
  const [activeWeek, setActiveWeek] = useState<number>(urlWeek || 1);
  const [didInit, setDidInit] = useState(false);
  const stripRef = useRef<HTMLDivElement>(null);

  function selectWeek(w: number) {
    setActiveWeek(w);
    setSearchParams({ week: String(w) }, { replace: true });
  }

  useEffect(() => {
    if (didInit) return;
    if (!urlWeek) {
      const planLogs = logs.filter((l) => logKind(l) === 'plan' && hasResults(l));
      let latestWeek = 1;
      for (const l of planLogs) {
        const d = l.dayId ? byId(l.dayId) : undefined;
        if (d && d.week > latestWeek) latestWeek = d.week;
      }
      setActiveWeek(latestWeek);
    }
    setDidInit(true);
  }, [didInit, urlWeek, logs]);

  const completedDayIds = useMemo(() => {
    const s = new Set<string>();
    for (const l of logs) {
      if (logKind(l) === 'plan' && l.dayId && hasResults(l)) s.add(l.dayId);
    }
    return s;
  }, [logs]);

  const today = todayISO();
  const scheduledByDayId = useMemo(() => {
    const m = new Map<string, string>();
    for (const l of logs) {
      if (logKind(l) !== 'plan' || !l.dayId) continue;
      if (l.status !== 'planned' || hasResults(l)) continue;
      if (l.date <= today) continue;
      const existing = m.get(l.dayId);
      if (!existing || l.date < existing) m.set(l.dayId, l.date);
    }
    return m;
  }, [logs, today]);

  const upcoming = useMemo(() => {
    return logs
      .filter((l) => logKind(l) === 'plan' && l.dayId && l.status === 'planned' && !hasResults(l) && l.date > today)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [logs, today]);

  const weekIsComplete = (ds: Day[]) => ds.every((d) => completedDayIds.has(d.id));

  useEffect(() => {
    if (!didInit) return;
    const el = stripRef.current?.querySelector(`[data-week="${activeWeek}"]`) as HTMLElement | null;
    el?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [activeWeek, didInit]);

  const days = weeks.find(([w]) => w === activeWeek)?.[1] ?? [];
  const phase = days[0]?.phase ?? 'BASE';

  return (
    <div className="mt-4">
      <div className="border-y border-line">
        <div ref={stripRef} className="flex gap-2 overflow-x-auto no-scrollbar px-3 py-2">
          {weeks.map(([w, ds]) => {
            const complete = weekIsComplete(ds);
            const active = w === activeWeek;
            return (
              <button
                key={w}
                data-week={w}
                onClick={() => selectWeek(w)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider border ${
                  active
                    ? 'bg-accent text-bg border-accent'
                    : complete
                      ? 'bg-transparent text-muted/60 border-line line-through'
                      : 'bg-transparent text-muted border-line'
                }`}
              >
                W{String(w).padStart(2, '0')} · {ds[0].phase}
                {complete && !active && ' ✓'}
              </button>
            );
          })}
        </div>
      </div>

      {upcoming.length > 0 && (
        <section className="pt-4">
          <div className="px-4 flex items-baseline justify-between">
            <span className="text-xs uppercase tracking-widest text-accent">Upcoming</span>
            <span className="text-[10px] uppercase tracking-wider text-muted">{upcoming.length} scheduled</span>
          </div>
          <ul className="mt-2 flex gap-2 overflow-x-auto no-scrollbar px-4 pb-1 snap-x snap-mandatory">
            {upcoming.map((l) => {
              const d = byId(l.dayId!);
              if (!d) return null;
              return (
                <li key={l.id} className="shrink-0 w-40 snap-start">
                  <Link to={`/plan/${d.id}`} className="block bg-panel rounded-lg p-3 active:bg-panel2 h-full">
                    <div className="flex items-center gap-2">
                      <div className="w-1 h-6 rounded-full" style={{ backgroundColor: HYROX_TYPES[d.category].color }} />
                      <span className="text-xs text-accent">{formatShortDate(l.date)}</span>
                      <span className="text-[10px] font-semibold uppercase tracking-wider ml-auto" style={{ color: HYROX_TYPES[d.category].color }}>
                        {HYROX_TYPES[d.category].name.slice(0, 4)}
                      </span>
                    </div>
                    <div className="text-[11px] text-muted mt-1.5 uppercase tracking-wider">W{d.week} · {DAY_LABEL[d.dayOfWeek]}</div>
                    <div className="text-sm leading-snug mt-0.5 line-clamp-2">{d.workoutLabel}</div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <div className="px-4 pt-5 pb-2">
        <div className="text-[10px] text-muted uppercase tracking-[0.25em] font-semibold">Week {activeWeek}</div>
        <div className="font-display text-5xl mt-1 leading-[0.9] tracking-[-0.03em]">
          <span
            className="bg-clip-text text-transparent"
            style={{ backgroundImage: 'linear-gradient(135deg, #FFD500 0%, #F0E040 35%, #FF9B5C 70%, #FF6B6B 100%)' }}
          >
            {PHASE_LABEL[phase]}
          </span>
        </div>
      </div>

      <ul className="px-4 space-y-2">
        {days.map((d) => {
          const done = completedDayIds.has(d.id);
          const scheduledDate = scheduledByDayId.get(d.id);
          return (
            <li key={d.id}>
              <Link
                to={`/plan/${d.id}`}
                className={`block bg-panel rounded-lg p-3 active:bg-panel2 ${done ? 'opacity-50' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-1 h-12 rounded-full" style={{ backgroundColor: HYROX_TYPES[d.category].color }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{DAY_LABEL[d.dayOfWeek]}</span>
                      <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: HYROX_TYPES[d.category].color }}>
                        {HYROX_TYPES[d.category].name}
                      </span>
                      {done && (
                        <span className="ml-auto inline-block bg-accent text-bg text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded">
                          Done ✓
                        </span>
                      )}
                      {!done && scheduledDate && (
                        <span className="text-[10px] text-accent ml-auto">📅 {scheduledDate}</span>
                      )}
                    </div>
                    <div className={`text-sm truncate ${done ? 'text-muted line-through' : 'text-white/90'}`}>{d.workoutLabel}</div>
                    <div className="text-xs text-muted truncate">{setupSummary(d.setup)}</div>
                  </div>
                  <span className="text-muted">›</span>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
      {!planActive && (
        <p className="px-4 mt-4 text-xs text-muted">Start the program to track your progress as you go.</p>
      )}
    </div>
  );
}

// ---- Cadence plan (weekly target + go-to pool; no weeks) ----

function CadenceBody({ plan, logs }: { plan: UserPlan; logs: WorkoutLog[] }) {
  const [workouts, setWorkouts] = useState<Map<string, CustomWorkout>>(new Map());
  const typeOf = useLogTypeResolver();
  useEffect(() => {
    getCustomWorkouts().then((ws) => setWorkouts(new Map(ws.map((w) => [w.id, w]))));
  }, []);

  // Prefer the go-to pool; with none, any custom workout is loggable toward the
  // plan, so the page is never a dead end.
  const poolIds = poolSlots(plan).flatMap((s) => (s.kind === 'workout' ? [s.workoutId] : []));
  const usingPool = poolIds.length > 0;
  const targets: CustomWorkout[] = usingPool
    ? poolIds.map((id) => workouts.get(id)).filter((w): w is CustomWorkout => !!w)
    : [...workouts.values()];

  // Duration: ongoing, or "week X of N" once started (anchored on createdAt).
  let durationLabel = 'Ongoing';
  if (plan.durationWeeks) {
    if (plan.active && plan.createdAt) {
      const startMon = mondayOfWeek(new Date(plan.createdAt));
      const nowMon = mondayOfWeek(new Date());
      const wk = Math.floor((nowMon.getTime() - startMon.getTime()) / (7 * 86400000)) + 1;
      durationLabel = wk > plan.durationWeeks
        ? `Complete · ${plan.durationWeeks} weeks`
        : `Week ${Math.max(1, wk)} of ${plan.durationWeeks}`;
    } else {
      durationLabel = `${plan.durationWeeks}-week block`;
    }
  }

  return (
    <div className="mt-4">
      <div className="px-4 py-2 border-y border-line text-xs uppercase tracking-widest text-muted">
        {durationLabel}
      </div>

      {/* HabitKit-style adherence: this plan's sessions over the last weeks. */}
      <div className="px-4 mt-4">
        <div className="text-[10px] uppercase tracking-widest text-muted mb-1.5">Consistency</div>
        <ConsistencyHeatmap logs={logs} typeOf={typeOf} />
      </div>

      <div className="px-4 mt-5">
        <div className="text-[10px] uppercase tracking-widest text-muted mb-1.5">
          {usingPool ? 'Go-to workouts' : 'Log a workout'}
        </div>
        {!usingPool && (
          <p className="text-xs text-muted mb-2">Pick any workout — it counts toward this plan.</p>
        )}
        {targets.length === 0 ? (
          <p className="text-sm text-muted">
            No workouts yet. <Link to="/workout/new" className="text-accent">Build one →</Link>
          </p>
        ) : (
          <ul className="space-y-2">
            {targets.map((w) => (
              <li key={w.id}>
                <Link
                  to={`/workout/${w.id}?planId=${plan.id}`}
                  className="flex items-center justify-between gap-3 bg-panel rounded-lg p-3 active:bg-panel2"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate">{w.name}</div>
                    <div className="text-xs text-muted truncate">{setupSummary(customToSetup(w).setup)}</div>
                  </div>
                  <span className="text-muted shrink-0">›</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ---- User-built sequenced plan (day-of-week grid per week) ----

function SequencedBody({ plan, logs }: { plan: UserPlan; logs: WorkoutLog[] }) {
  const weeks = plan.content?.type === 'sequenced' ? plan.content.weeks : [];
  const [workouts, setWorkouts] = useState<Map<string, CustomWorkout>>(new Map());
  const [activeWeek, setActiveWeek] = useState(1);

  useEffect(() => {
    getCustomWorkouts().then((ws) => setWorkouts(new Map(ws.map((w) => [w.id, w]))));
  }, []);

  // For dated plans, map each weekday slot to a real date and tick it when a
  // qualifying log exists that day.
  const startMonday = plan.startDate ? mondayOfWeek(new Date(`${plan.startDate}T00:00:00`)) : null;
  const doneDates = useMemo(() => {
    const s = new Set<string>();
    for (const l of logs) if (isQualifying(l, plan.id)) s.add(l.date);
    return s;
  }, [logs, plan.id]);

  function slotDate(weekIdx: number, dayIdx: number): string | null {
    if (!startMonday) return null;
    const d = new Date(startMonday);
    d.setDate(d.getDate() + weekIdx * 7 + dayIdx);
    return isoDate(d);
  }

  if (weeks.length === 0) {
    return (
      <div className="px-4 mt-6 text-sm text-muted">
        {plan.goalPerWeek
          ? 'This is a cadence goal — log any workout and tag it to this plan to build your streak.'
          : 'This plan has no weeks yet.'}
        <div className="mt-3">
          <Link to={`/plan/${plan.id}/edit`} className="text-accent">Edit plan →</Link>
        </div>
      </div>
    );
  }

  const week = weeks[activeWeek - 1] ?? { slots: [] };
  const dayed = WEEKDAYS_7
    .map((dow) => ({ dow, slot: slotForDay(week, dow) }))
    .filter((x) => x.slot);
  const anytime = anytimeSlots(week);

  // Renders the right-hand content of a slot row (workout link / rest).
  function slotContent(slot: typeof week.slots[number], date: string | null, done: boolean) {
    if (slot.kind === 'rest') return <span className="text-sm text-muted">🛌 Rest</span>;
    const w = workouts.get(slot.workoutId);
    if (!w) return <span className="text-sm text-muted/60">Workout removed</span>;
    return (
      <Link
        to={`/workout/${w.id}?planId=${plan.id}${date ? `&date=${date}` : ''}`}
        className="flex-1 min-w-0"
      >
        <div className={`text-sm font-semibold truncate ${done ? 'text-muted line-through' : ''}`}>{w.name}</div>
        <div className="text-xs text-muted truncate">{setupSummary(customToSetup(w).setup)}</div>
      </Link>
    );
  }

  return (
    <div className="mt-4">
      <div className="border-y border-line">
        <div className="flex gap-2 overflow-x-auto no-scrollbar px-3 py-2">
          {weeks.map((_, i) => {
            const w = i + 1;
            const active = w === activeWeek;
            return (
              <button
                key={w}
                onClick={() => setActiveWeek(w)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider border ${
                  active ? 'bg-accent text-bg border-accent' : 'bg-transparent text-muted border-line'
                }`}
              >
                Week {w}
              </button>
            );
          })}
        </div>
      </div>

      <ul className="px-4 mt-4 space-y-2">
        {dayed.map(({ dow, slot }) => {
          const date = slotDate(activeWeek - 1, WEEKDAYS_7.indexOf(dow));
          const done = date ? doneDates.has(date) : false;
          return (
            <li key={dow} className="flex items-center gap-3 bg-panel rounded-lg p-3">
              <span className="w-10 text-xs font-black uppercase tracking-widest text-muted shrink-0">
                {DAY_LABEL[dow]}
              </span>
              {slotContent(slot!, date, done)}
              {done && (
                <span className="ml-auto inline-block bg-accent text-bg text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded shrink-0">
                  Done ✓
                </span>
              )}
              {!done && date && (
                <span className="ml-auto text-[10px] text-accent shrink-0">{formatShortDate(date)}</span>
              )}
            </li>
          );
        })}
      </ul>

      {anytime.length > 0 && (
        <div className="px-4 mt-4">
          <div className="text-[10px] uppercase tracking-widest text-muted mb-1.5">Any day this week</div>
          <ul className="space-y-2">
            {anytime.map((slot, i) => (
              <li key={i} className="flex items-center gap-3 bg-panel rounded-lg p-3">
                {slotContent(slot, null, false)}
              </li>
            ))}
          </ul>
        </div>
      )}

      {dayed.length === 0 && anytime.length === 0 && (
        <p className="px-4 mt-4 text-sm text-muted">Nothing scheduled this week.</p>
      )}
    </div>
  );
}
