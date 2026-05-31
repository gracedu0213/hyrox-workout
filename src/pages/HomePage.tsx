import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { getAllLogs } from '../db';
import { byId, CATEGORY_COLOR, DAY_LABEL } from '../plan';
import { formatExercise, setupSummary } from '../format';
import { hasResults, logKind, logSummary } from '../logSummary';
import Fab from '../components/Fab';
import ResultHero from '../components/ResultHero';
import { useProfile } from '../profile';
import type { WorkoutLog } from '../types';

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function HomePage() {
  const [logs, setLogs] = useState<WorkoutLog[]>([]);

  async function refresh() {
    setLogs(await getAllLogs());
  }
  useEffect(() => { refresh(); }, []);

  const today = todayISO();
  const todayLogs = logs.filter((l) => l.date === today);
  const past = logs.filter((l) => l.date < today);
  const upcoming = logs
    .filter((l) => l.date > today && l.status === 'planned' && !hasResults(l))
    .sort((a, b) => a.date.localeCompare(b.date));
  const todayDone = todayLogs.length > 0 && todayLogs.every(hasResults);

  return (
    <div className="px-4 py-5 space-y-5 relative">
      <section>
        <div className="text-[10px] uppercase tracking-[0.25em] text-muted font-semibold">Today · {today}</div>
        <h1 className="font-display text-5xl mt-2 leading-[0.9] tracking-[-0.03em]">
          {todayLogs.length === 0 ? (
            <>What's on for <span className="bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(135deg, #FFD500 0%, #F0E040 35%, #FF9B5C 70%, #FF6B6B 100%)' }}>today?</span></>
          ) : (
            <>Let's <span className="bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(135deg, #FFD500 0%, #F0E040 35%, #FF9B5C 70%, #FF6B6B 100%)' }}>train.</span></>
          )}
        </h1>
        {todayLogs.length === 0 && (
          <p className="text-sm text-muted mt-3">Tap the + button to pick a workout, log something custom, or mark a rest day.</p>
        )}
      </section>

      {/* Today's items */}
      {todayLogs.length > 0 && (
        <section className="space-y-3">
          {todayLogs.map((l) => <TodayCard key={l.id} log={l} onChange={refresh} />)}
        </section>
      )}

      {/* Quiet completion banner — not a second hero CTA */}
      {todayDone && (
        <Link
          to="/plan"
          className="flex items-center justify-between border border-line rounded-lg px-3 py-2.5 text-sm"
        >
          <span>Today's done 🎉</span>
          <span className="text-accent">Schedule next →</span>
        </Link>
      )}

      {/* Upcoming scheduled */}
      {upcoming.length > 0 && (
        <section>
          <div className="text-xs uppercase tracking-widest text-muted mb-2">Upcoming</div>
          <ul className="space-y-2">
            {upcoming.slice(0, 3).map((l) => <UpcomingCard key={l.id} log={l} />)}
          </ul>
        </section>
      )}

      {/* Last logged */}
      {past[0] && (
        <section>
          <div className="text-xs uppercase tracking-widest text-muted mb-2">Last workout</div>
          <LastLogCard log={past[0]} />
        </section>
      )}

      <Fab todayISO={today} onRest={refresh} />
    </div>
  );
}

function TodayCard({ log }: { log: WorkoutLog; onChange: () => void }) {
  const kind = logKind(log);
  const planDay = log.dayId ? byId(log.dayId) : undefined;
  const planned = log.status === 'planned' && !hasResults(log);
  const { profile } = useProfile();
  const gender = profile?.gender;

  // ----- REST DAY -----
  if (kind === 'rest') {
    return (
      <Link to={`/log/${log.id}`} className="block bg-panel rounded-lg p-4 text-center">
        <div className="text-3xl">🛌</div>
        <div className="mt-1 font-semibold">Rest day</div>
        <div className="text-xs text-muted mt-1">Recover up.</div>
      </Link>
    );
  }

  // ----- CUSTOM -----
  if (kind === 'custom') {
    return (
      <Link to={`/log/${log.id}`} className="block bg-panel rounded-lg p-4">
        <div className="flex items-baseline gap-2">
          <span className="text-xs uppercase tracking-widest text-accent">Custom</span>
          <span className="text-xs ml-auto text-accent uppercase tracking-wider">Logged ✓</span>
        </div>
        <div className="font-display text-2xl mt-1">{log.customName}</div>
        <div className="-mx-4 mt-4"><ResultHero log={log} size="card" /></div>
        <div className="mt-3 pt-3 border-t border-line flex items-center justify-between text-xs">
          <span className="text-muted">Tap to review</span>
          <span className="text-accent">→</span>
        </div>
      </Link>
    );
  }

  // ----- PLAN WORKOUT -----
  if (!planDay) return null;

  const ctaTo = planned ? `/plan/${planDay.id}/log?id=${log.id}` : `/log/${log.id}`;
  const exerciseList = planDay.exercises.filter((e) => !e.name.startsWith('—')).slice(0, 6);

  return (
    <Link
      to={ctaTo}
      className="block bg-panel rounded-lg p-4 active:bg-panel2"
    >
      <div className="flex items-baseline gap-2">
        <span className={`text-xs font-semibold uppercase tracking-wider text-${CATEGORY_COLOR[planDay.category]}`}>
          {planDay.category}
        </span>
        <span className="text-sm text-muted">W{planDay.week} · {DAY_LABEL[planDay.dayOfWeek]}</span>
        {planned ? (
          <span className="text-xs ml-auto uppercase tracking-wider text-muted">Planned</span>
        ) : (
          <span className="ml-auto inline-block bg-accent text-bg text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded">
            Logged ✓
          </span>
        )}
      </div>
      <div className="font-display text-2xl mt-1">{planDay.workoutLabel}</div>
      <div className="text-sm text-muted mt-1">{setupSummary(planDay.setup)}</div>

      {planned ? (
        <>
          <ul className="mt-3 space-y-1.5 text-sm text-white/85">
            {exerciseList.map((ex, i) => (
              <li key={i} className="truncate">• {formatExercise(ex, { gender })}</li>
            ))}
            {planDay.exercises.filter((e) => !e.name.startsWith('—')).length > 6 && (
              <li className="text-muted text-xs">+ more…</li>
            )}
          </ul>
          <div className="mt-4 pt-3 border-t border-line flex items-center justify-between text-sm">
            <span className="text-accent">Tap to log results</span>
            <span className="text-accent">→</span>
          </div>
        </>
      ) : (
        <>
          <div className="-mx-4 mt-5"><ResultHero log={log} size="card" /></div>
          <div className="mt-3 pt-3 border-t border-line flex items-center justify-between text-xs">
            <span className="text-muted">Tap to review</span>
            <span className="text-accent">→</span>
          </div>
        </>
      )}
    </Link>
  );
}


function UpcomingCard({ log }: { log: WorkoutLog }) {
  const d = log.dayId ? byId(log.dayId) : undefined;
  if (!d) return null;
  return (
    <li>
      <Link to={`/plan/${d.id}`} className="block bg-panel rounded-lg p-3">
        <div className="flex items-center gap-3">
          <div className={`w-1 h-10 rounded-full bg-${CATEGORY_COLOR[d.category]}`} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs text-accent">{log.date}</span>
              <span className={`text-[10px] font-semibold uppercase tracking-wider text-${CATEGORY_COLOR[d.category]}`}>
                {d.category}
              </span>
            </div>
            <div className="text-sm truncate">W{d.week} {DAY_LABEL[d.dayOfWeek]} · {d.workoutLabel}</div>
          </div>
          <span className="text-muted">›</span>
        </div>
      </Link>
    </li>
  );
}

function LastLogCard({ log }: { log: WorkoutLog }) {
  const kind = logKind(log);
  if (kind === 'rest') {
    return (
      <Link to={`/history`} className="block bg-panel rounded-lg p-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🛌</span>
          <div className="flex-1">
            <div className="text-xs text-muted">{log.date}</div>
            <div className="text-sm">Rest day</div>
          </div>
        </div>
      </Link>
    );
  }
  if (kind === 'custom') {
    return (
      <Link to={`/log/${log.id}`} className="block bg-panel rounded-lg p-3">
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
    <Link to={`/log/${log.id}`} className="block bg-panel rounded-lg p-3">
      <div className="flex items-center gap-3">
        <div className={`w-1 h-12 rounded-full bg-${CATEGORY_COLOR[d.category]}`} />
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted">{log.date}</span>
            <LogResultChip log={log} />
          </div>
          <div className="text-sm font-semibold truncate mt-1">W{d.week} {DAY_LABEL[d.dayOfWeek]} · {d.workoutLabel}</div>
        </div>
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
  // Compact gradient-text time/result so the home rows have a hint of the hero.
  return (
    <span
      className="font-display text-lg leading-none tracking-tight bg-clip-text text-transparent"
      style={{ backgroundImage: 'linear-gradient(135deg, #FFD500 0%, #F0E040 35%, #FF9B5C 70%, #FF6B6B 100%)' }}
    >
      {summary || 'Logged'}
    </span>
  );
}

