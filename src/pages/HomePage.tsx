import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { getActivePlans, getAllLogs, newId, saveLog } from '../db';
import { isCadence, poolSlots } from '../plans';
import CadenceLogSheet from '../components/CadenceLogSheet';
import { byId, DAY_LABEL } from '../plan';
import { formatSec, setupSummary } from '../format';
import { hasResults, logKind, logSummary } from '../logSummary';
import { computeStreak, computeActivityStreak, weekProgress, isQualifying } from '../planStats';
import Fab from '../components/Fab';
import ConsistencyHeatmap from '../components/ConsistencyHeatmap';
import MonthCalendar from '../components/MonthCalendar';
import { useLogTypeResolver } from '../logTypeColor';
import { CATEGORIES } from '../tags';
import { todayISO } from '../dateUtils';
import { formatKm, runDistanceKm, runStructure, timeAndPace } from '../runs';
import type { UserPlan, WorkoutLog } from '../types';

const GRADIENT = 'linear-gradient(135deg, #FFD500 0%, #F0E040 35%, #FF9B5C 70%, #FF6B6B 100%)';

export default function HomePage() {
  const [logs, setLogs] = useState<WorkoutLog[]>([]);
  const [activePlans, setActivePlans] = useState<UserPlan[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [cadenceSheet, setCadenceSheet] = useState<UserPlan | null>(null);
  const nav = useNavigate();

  // Two calendar lenses on the same logs: the 10-week grid for streak texture,
  // the month view for per-session detail. The choice persists per device.
  const [calView, setCalView] = useState<'grid' | 'month'>(
    () => (localStorage.getItem('hyrox.calview.v1') === 'month' ? 'month' : 'grid'),
  );
  function switchCalView(v: 'grid' | 'month') {
    setCalView(v);
    localStorage.setItem('hyrox.calview.v1', v);
  }
  const typeOf = useLogTypeResolver();
  async function refresh() {
    const [l, p] = await Promise.all([getAllLogs(), getActivePlans()]);
    setLogs(l);
    setActivePlans(p);
  }
  useEffect(() => { refresh(); }, []);

  const today = todayISO();
  const todayLogs = logs.filter((l) => l.date === today);
  const past = logs.filter((l) => l.date < today);
  const upcoming = logs
    .filter((l) => l.date > today && l.status === 'planned' && !hasResults(l))
    .sort((a, b) => a.date.localeCompare(b.date));
  const streak = computeActivityStreak(logs);
  const hasActivity = logs.some((l) => logKind(l) !== 'rest' && hasResults(l));

  // Cadence plans log straight away (single go-to → that workout; otherwise the
  // quick-pick sheet, which falls back to all workouts when the pool is empty).
  const cadenceLog = (p: UserPlan) => {
    const pool = poolSlots(p).filter((s) => s.kind === 'workout');
    if (pool.length === 1 && pool[0].kind === 'workout') nav(`/workout/${pool[0].workoutId}/log?planId=${p.id}`);
    else setCadenceSheet(p);
  };

  // Everything on your plate today is one kind of thing — a card in the Today
  // rail. Order: to-dos (unfinished sessions, then standing cadence goals) → done.
  const toDoLogs = todayLogs.filter((l) => !hasResults(l) && logKind(l) !== 'rest');
  const doneLogs = todayLogs.filter((l) => hasResults(l) || logKind(l) === 'rest');

  // The rail holds today's to-dos only: planned sessions + standing cadence
  // goals. Structured plans (12-week/sequenced) are "just a plan" → they live in
  // the Plan tab; their scheduled days surface here as planned sessions instead.
  const railItems: React.ReactNode[] = [];
  for (const l of toDoLogs) railItems.push(<TodoWorkoutCard key={l.id} log={l} />);
  for (const p of activePlans) {
    if (!isCadence(p)) continue;
    const planLogs = logs.filter((l) => l.planId === p.id);
    const { done } = weekProgress(planLogs, p);
    const planStreak = computeStreak(planLogs, p);
    const loggedToday = planLogs.some((l) => l.date === today && isQualifying(l, p.id));
    railItems.push(
      <CadenceTodoCard
        key={p.id}
        plan={p}
        done={done}
        goal={p.goalPerWeek!}
        streak={planStreak}
        loggedToday={loggedToday}
        onLog={() => cadenceLog(p)}
      />,
    );
  }
  for (const l of doneLogs) railItems.push(<TodoWorkoutCard key={l.id} log={l} />);

  const railEmpty = railItems.length === 0;

  return (
    <div className="px-4 py-5 space-y-6 relative">
      {/* ── Today — one swipeable rail of everything on your plate ───────── */}
      <section>
        <div className="text-[10px] uppercase tracking-[0.25em] text-muted font-semibold mb-2.5">Today · {today}</div>
        {railEmpty ? <EmptyDayHero onRest={refresh} today={today} /> : <TodayRail items={railItems} />}
      </section>

      {/* ── Consistency — streak hero + activity heatmap ────────────────── */}
      {hasActivity && (
        <section>
          <SectionLabel
            action={
              <div className="flex rounded-full border border-line overflow-hidden">
                {(['grid', 'month'] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => switchCalView(v)}
                    className={`px-2.5 py-0.5 text-[10px] uppercase tracking-wider ${
                      calView === v ? 'bg-panel2 text-white' : 'text-muted'
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            }
          >
            Consistency
          </SectionLabel>
          <div className="bg-panel rounded-xl p-4">
            {streak > 0 && (
              <div className="flex items-baseline gap-2 mb-3">
                <span className="text-2xl leading-none">🔥</span>
                <span className="font-display text-4xl text-accent leading-none tracking-tight">{streak}</span>
                <span className="text-[11px] uppercase tracking-widest text-muted pb-1">week streak</span>
              </div>
            )}
            {calView === 'grid' ? (
              <ConsistencyHeatmap legend logs={logs} typeOf={typeOf} selected={selectedDate} onSelect={(d) => setSelectedDate(d === selectedDate ? null : d)} />
            ) : (
              <MonthCalendar legend logs={logs} typeOf={typeOf} selected={selectedDate} onSelect={(d) => setSelectedDate(d === selectedDate ? null : d)} />
            )}
            {selectedDate ? (
              <SelectedDay date={selectedDate} logs={logs.filter((l) => l.date === selectedDate)} />
            ) : (
              <div className="text-[10px] text-muted mt-2">
                {calView === 'grid' ? 'Last 10 weeks · tap a day' : 'Tap a day'}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── Upcoming scheduled ──────────────────────────────────────────── */}
      {upcoming.length > 0 && (
        <section>
          <SectionLabel>Upcoming</SectionLabel>
          <ul className="space-y-2">
            {upcoming.slice(0, 3).map((l) => <UpcomingCard key={l.id} log={l} />)}
          </ul>
        </section>
      )}

      {/* ── Last logged ─────────────────────────────────────────────────── */}
      {past[0] && (
        <section>
          <SectionLabel>Last workout</SectionLabel>
          <LastLogCard log={past[0]} />
        </section>
      )}

      <Fab dateISO={selectedDate ?? today} isToday={(selectedDate ?? today) === today} onRest={refresh} />
      {cadenceSheet && <CadenceLogSheet plan={cadenceSheet} onClose={() => setCadenceSheet(null)} />}
    </div>
  );
}

// One consistent section header used everywhere on this page.
function SectionLabel({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between mb-2.5">
      <div className="text-xs uppercase tracking-widest text-muted">{children}</div>
      {action}
    </div>
  );
}

// Swipeable rail: each item is a same-size card with a peek of the next + dots,
// so it reads as "swipe me." Slides share a min-height and stretch to the tallest.
function TodayRail({ items }: { items: React.ReactNode[] }) {
  const scroller = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const multi = items.length > 1;

  function onScroll() {
    const el = scroller.current;
    if (!el) return;
    const card = el.firstElementChild as HTMLElement | null;
    const step = card ? card.clientWidth + 12 : el.clientWidth; // 12 = gap-3
    setActive(Math.round(el.scrollLeft / step));
  }

  return (
    <>
      <div
        ref={scroller}
        onScroll={onScroll}
        className="flex items-stretch gap-3 overflow-x-auto no-scrollbar snap-x snap-mandatory -mx-4 px-4 pb-1"
      >
        {items.map((node, i) => (
          <div key={i} className={`snap-start shrink-0 min-h-[164px] ${multi ? 'w-[86%]' : 'w-full'}`}>
            {node}
          </div>
        ))}
      </div>
      {multi && (
        <div className="flex justify-center gap-1.5 mt-2.5">
          {items.map((_, i) => (
            <div key={i} className={`h-1.5 rounded-full transition-all ${i === active ? 'w-4 bg-accent' : 'w-1.5 bg-line'}`} />
          ))}
        </div>
      )}
    </>
  );
}

// A single workout for today — planned (Log results) or done (compact gradient
// result + tap to review). Compact card form so it sits in the rail; the full
// result hero and exercise list live on the log/detail pages.
function TodoWorkoutCard({ log }: { log: WorkoutLog }) {
  const kind = logKind(log);
  const planDay = log.dayId ? byId(log.dayId) : undefined;
  const planned = log.status === 'planned' && !hasResults(log);

  if (kind === 'rest') {
    return (
      <Link to={`/log/${log.id}`} className="flex flex-col h-full items-center justify-center text-center rounded-2xl p-5 bg-panel active:bg-panel2">
        <div className="text-4xl">🛌</div>
        <div className="mt-2 font-display text-2xl">Rest day</div>
        <div className="text-xs text-muted mt-1">Recover up.</div>
      </Link>
    );
  }

  let chip: React.ReactNode;
  let title: string;
  let setup: string | undefined;
  let dayMeta: React.ReactNode = null;
  let result = logSummary(log);
  if (log.run) {
    // Distance is the headline; time + pace sit on the structure line.
    const km = runDistanceKm(log.run);
    chip = <span className="text-xs uppercase tracking-widest text-accent">Run</span>;
    title = log.customName ?? 'Run';
    setup = [runStructure(log.run), timeAndPace(log.run, log.totalTimeSec)].filter(Boolean).join(' · ');
    result = km ? formatKm(km) : timeAndPace(log.run, log.totalTimeSec);
  } else if (kind === 'custom') {
    chip = <span className="text-xs uppercase tracking-widest text-accent">Custom</span>;
    title = log.customName ?? 'Custom';
    setup = log.workoutSnapshot ? setupSummary(log.workoutSnapshot.setup) : undefined;
  } else if (planDay) {
    chip = (
      <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: CATEGORIES[planDay.category].color }}>
        {CATEGORIES[planDay.category].name}
      </span>
    );
    dayMeta = <span className="text-xs text-muted">W{planDay.week} · {DAY_LABEL[planDay.dayOfWeek]}</span>;
    title = planDay.workoutLabel;
    setup = setupSummary(planDay.setup);
  } else {
    return null;
  }

  const ctaTo = planned
    ? kind === 'custom' && log.workoutId
      ? `/workout/${log.workoutId}/log?id=${log.id}`
      : planDay
        ? `/plan/${planDay.id}/log?id=${log.id}`
        : `/log/${log.id}`
    : `/log/${log.id}`;

  return (
    <Link to={ctaTo} className="relative overflow-hidden flex flex-col h-full rounded-2xl bg-panel active:bg-panel2">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: planned
            ? 'radial-gradient(ellipse at 88% -20%, rgba(255,213,0,0.16), transparent 55%), radial-gradient(ellipse at 0% 120%, rgba(255,107,107,0.10), transparent 55%)'
            : 'radial-gradient(ellipse at 20% 0%, rgba(255,213,0,0.10), transparent 55%)',
        }}
      />
      <span className="absolute top-2.5 right-3 text-accent/40 text-xs">✦</span>
      <div className="relative flex flex-col h-full p-4">
        <div className="flex items-baseline gap-2">
          {chip}
          {dayMeta}
          {planned ? (
            <span className="text-[10px] ml-auto uppercase tracking-wider text-muted">Planned</span>
          ) : (
            <span className="ml-auto inline-block bg-accent text-bg text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded">
              Logged ✓
            </span>
          )}
        </div>
        <div className="font-display text-2xl mt-1 leading-tight line-clamp-2">{title}</div>
        {setup && <div className="text-xs text-muted mt-1 line-clamp-1">{setup}</div>}

        {!planned && (
          <div
            className="mt-3 font-display text-4xl leading-none tracking-tight bg-clip-text text-transparent"
            style={{ backgroundImage: GRADIENT }}
          >
            {result || 'Logged'}
          </div>
        )}

        <div className="mt-auto pt-4">
          {planned ? (
            <div
              className="rounded-lg py-3 text-center font-black uppercase tracking-widest text-xs text-bg"
              style={{ backgroundImage: GRADIENT, boxShadow: '0 6px 22px rgba(255,107,107,0.28)' }}
            >
              Log it →
            </div>
          ) : (
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted">Tap to review</span>
              <span className="text-accent">→</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

// Progress pips: one segment per planned session this week, filled (and glowing)
// up to `done`.
function TrackerPips({ done, goal, color, className = '' }: { done: number; goal: number; color: string; className?: string }) {
  return (
    <div className={`flex gap-1.5 ${className}`}>
      {Array.from({ length: Math.max(goal, 1) }).map((_, i) => {
        const filled = i < done;
        return (
          <div
            key={i}
            className="h-2.5 flex-1 rounded-full transition-all"
            style={{
              backgroundColor: filled ? color : 'rgba(255,255,255,0.10)',
              boxShadow: filled ? `0 0 10px ${color}77` : undefined,
            }}
          />
        );
      })}
    </div>
  );
}

// Cadence to-do — the playful one. Stays a to-do (with a Log CTA) until the
// weekly goal is met, then flips to a celebratory done state. Plan color carries
// the energy so the page's yellow→coral gradient stays reserved for results.
function CadenceTodoCard({
  plan,
  done,
  goal,
  streak,
  loggedToday,
  onLog,
}: {
  plan: UserPlan;
  done: number;
  goal: number;
  streak: number;
  loggedToday: boolean;
  onLog: () => void;
}) {
  const color = plan.color;
  const complete = done >= goal;
  const remaining = Math.max(goal - done, 0);
  const hype = complete
    ? 'Weekly goal smashed 🎉'
    : loggedToday
      ? `Nice — ${remaining} more to go`
      : done === 0
        ? "Let's kick off the week 💥"
        : `${remaining} more to hit your goal`;
  return (
    <div
      className="relative overflow-hidden rounded-2xl h-full flex flex-col bg-panel"
      style={{ border: `1px solid ${color}59` }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at 82% -10%, ${color}45, transparent 60%), radial-gradient(ellipse at 0% 120%, ${color}24, transparent 55%)`,
        }}
      />
      <span className="absolute top-2.5 right-3 text-sm" style={{ color: `${color}aa` }}>✦</span>
      <span className="absolute bottom-2.5 left-3 text-xs" style={{ color: `${color}66` }}>✦</span>

      <div className="relative flex flex-col h-full p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            {plan.icon && <span className="text-base">{plan.icon}</span>}
            <span className="font-semibold text-sm truncate">{plan.name}</span>
          </div>
          {streak > 0 && <span className="text-xs text-muted shrink-0">🔥 {streak}wk</span>}
        </div>

        <div className="mt-2 flex items-end gap-1.5">
          <span
            className="font-display text-6xl leading-[0.78] tracking-tight"
            style={{ color, textShadow: `0 0 28px ${color}66` }}
          >
            {done}
          </span>
          <span className="font-display text-2xl leading-none text-muted pb-1">/ {goal}</span>
          <span className="text-[10px] uppercase tracking-widest text-muted pb-1.5 ml-auto">
            {complete ? 'done ✓' : 'this week'}
          </span>
        </div>

        <TrackerPips done={done} goal={goal} color={color} className="mt-3" />
        <div className="text-[11px] font-medium mt-2" style={{ color: complete ? color : undefined }}>
          {hype}
        </div>

        <div className="mt-auto pt-3">
          {complete ? (
            <div
              className="text-center text-sm font-black uppercase tracking-widest py-2.5 rounded-lg"
              style={{ color, border: `1px solid ${color}59` }}
            >
              Crushed it 🎉
            </div>
          ) : (
            <button
              onClick={onLog}
              className="w-full rounded-lg py-3 font-black uppercase tracking-widest text-sm active:scale-[0.97] transition-transform"
              style={{ backgroundColor: color, color: '#0a0a0a', boxShadow: `0 6px 22px ${color}55` }}
            >
              {loggedToday ? 'Log again →' : "Let's go →"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Empty-day hero: shown only when the rail has no cards — a
// real in-content CTA instead of relying on the floating +.
function EmptyDayHero({ onRest, today }: { onRest: () => void; today: string }) {
  async function addRest() {
    await saveLog({ id: newId(), date: today, createdAt: Date.now(), kind: 'rest', status: 'logged' });
    onRest();
  }
  return (
    <div className="bg-panel rounded-2xl p-5">
      <h1 className="font-display text-5xl leading-[0.9] tracking-[-0.03em]">
        What's on for{' '}
        <span className="bg-clip-text text-transparent" style={{ backgroundImage: GRADIENT }}>today?</span>
      </h1>
      <p className="text-sm text-muted mt-3">Nothing logged yet. Pick a workout to get going.</p>
      <Link
        to="/plan"
        className="mt-4 flex items-center justify-center gap-2 bg-accent text-bg rounded-lg py-3 font-black uppercase tracking-widest text-sm active:scale-[0.99] transition-transform"
      >
        Choose a workout →
      </Link>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <Link
          to="/custom/log"
          className="flex items-center justify-center gap-2 bg-panel2 rounded-lg py-2.5 text-sm font-semibold active:bg-panel"
        >
          🏀 Quick log
        </Link>
        <button
          onClick={addRest}
          className="flex items-center justify-center gap-2 bg-panel2 rounded-lg py-2.5 text-sm font-semibold active:bg-panel"
        >
          🛌 Rest day
        </button>
      </div>
    </div>
  );
}

// Inline browse-a-past-day list, driven by tapping a heatmap tile. Lead with
// per-day totals, then list each session (details-on-demand).
function SelectedDay({ date, logs }: { date: string; logs: WorkoutLog[] }) {
  const sessions = logs.filter((l) => logKind(l) !== 'rest');
  const totalSec = sessions.reduce((s, l) => s + (l.totalTimeSec ?? 0), 0);
  return (
    <div className="mt-3 pt-3 border-t border-line">
      <div className="flex items-baseline justify-between mb-1.5">
        <div className="text-[10px] uppercase tracking-widest text-accent">{date}</div>
        {sessions.length > 0 && (
          <div className="text-[10px] text-muted">
            {sessions.length} session{sessions.length === 1 ? '' : 's'}
            {totalSec > 0 && <> · {formatSec(totalSec)} total</>}
          </div>
        )}
      </div>
      {logs.length === 0 ? (
        <p className="text-xs text-muted">Nothing logged this day.</p>
      ) : (
        <ul className="space-y-1.5">
          {logs.map((l) => {
            const kind = logKind(l);
            const title = kind === 'rest'
              ? '🛌 Rest day'
              : kind === 'custom'
                ? (l.customName ?? 'Custom')
                : (l.dayId ? byId(l.dayId)?.workoutLabel ?? 'Workout' : 'Workout');
            return (
              <li key={l.id}>
                <Link to={`/log/${l.id}`} className="flex items-center justify-between gap-2 bg-panel2 rounded-lg px-3 py-2 active:opacity-70">
                  <span className="text-sm truncate">{title}</span>
                  <span className="text-xs text-muted shrink-0">{logSummary(l)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function UpcomingCard({ log }: { log: WorkoutLog }) {
  if (logKind(log) === 'custom') {
    return (
      <li>
        <Link
          to={log.workoutId ? `/workout/${log.workoutId}/log?id=${log.id}` : `/log/${log.id}`}
          className="flex items-center gap-3 bg-panel rounded-xl p-3 active:bg-panel2"
        >
          <div className="w-1 h-10 rounded-full bg-accent shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs text-accent">{log.date}</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">Custom</span>
            </div>
            <div className="text-sm truncate">{log.customName}</div>
          </div>
          <span className="text-muted">›</span>
        </Link>
      </li>
    );
  }
  const d = log.dayId ? byId(log.dayId) : undefined;
  if (!d) return null;
  return (
    <li>
      <Link to={`/plan/${d.id}`} className="flex items-center gap-3 bg-panel rounded-xl p-3 active:bg-panel2">
        <div className="w-1 h-10 rounded-full shrink-0" style={{ backgroundColor: CATEGORIES[d.category].color }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs text-accent">{log.date}</span>
            <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: CATEGORIES[d.category].color }}>
              {CATEGORIES[d.category].name}
            </span>
          </div>
          <div className="text-sm truncate">W{d.week} {DAY_LABEL[d.dayOfWeek]} · {d.workoutLabel}</div>
        </div>
        <span className="text-muted">›</span>
      </Link>
    </li>
  );
}

function LastLogCard({ log }: { log: WorkoutLog }) {
  const kind = logKind(log);
  if (kind === 'rest') {
    return (
      <Link to={`/log/${log.id}`} className="flex items-center gap-3 bg-panel rounded-xl p-3 active:bg-panel2">
        <span className="text-2xl">🛌</span>
        <div className="flex-1">
          <div className="text-xs text-muted">{log.date}</div>
          <div className="text-sm">Rest day</div>
        </div>
      </Link>
    );
  }
  if (kind === 'custom') {
    return (
      <Link to={`/log/${log.id}`} className="block bg-panel rounded-xl p-3 active:bg-panel2">
        <div className="flex justify-between items-center">
          <span className="text-xs text-muted">{log.date}</span>
          <LogResultChip log={log} />
        </div>
        <div className="text-sm font-semibold mt-1">Custom · {log.customName}</div>
      </Link>
    );
  }
  const d = log.dayId ? byId(log.dayId) : undefined;
  if (!d) return null;
  return (
    <Link to={`/log/${log.id}`} className="flex items-center gap-3 bg-panel rounded-xl p-3 active:bg-panel2">
      <div className="w-1 h-12 rounded-full shrink-0" style={{ backgroundColor: CATEGORIES[d.category].color }} />
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center">
          <span className="text-xs text-muted">{log.date}</span>
          <LogResultChip log={log} />
        </div>
        <div className="text-sm font-semibold truncate mt-1">W{d.week} {DAY_LABEL[d.dayOfWeek]} · {d.workoutLabel}</div>
      </div>
    </Link>
  );
}

function LogResultChip({ log }: { log: WorkoutLog }) {
  const summary = logSummary(log);
  const empty = log.status === 'planned' && !hasResults(log);
  if (empty) {
    return <span className="text-[10px] uppercase tracking-wider text-muted">Planned</span>;
  }
  // Solid accent (not gradient) — the gradient is reserved for the rail's result
  // moment so it keeps its punch.
  return (
    <span className="font-display text-lg leading-none tracking-tight text-accent">
      {summary || 'Logged'}
    </span>
  );
}
