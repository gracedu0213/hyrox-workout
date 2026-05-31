import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { PLAN, byId, DAY_LABEL, CATEGORY_COLOR } from '../plan';
import { setupSummary } from '../format';
import { getAllLogs } from '../db';
import { hasResults, logKind } from '../logSummary';
import type { Day, Phase, WorkoutLog } from '../types';

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatShortDate(iso: string): string {
  // "2026-05-28" -> "May 28"
  const [, m, d] = iso.split('-').map(Number);
  if (!m || !d) return iso;
  return `${MONTH_SHORT[m - 1]} ${d}`;
}

const PHASE_LABEL: Record<Phase, string> = {
  BASE: 'BASE',
  PACE: 'PACE',
  ACCELERATE: 'ACCELERATE',
  PRIME: 'PRIME',
  RACE: 'RACE',
};

export default function PlanPage() {
  const weeks = useMemo(() => {
    const map = new Map<number, Day[]>();
    for (const d of PLAN.days) {
      if (!map.has(d.week)) map.set(d.week, []);
      map.get(d.week)!.push(d);
    }
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
  }, []);

  const [logs, setLogs] = useState<WorkoutLog[]>([]);
  const [activeWeek, setActiveWeek] = useState<number>(1);
  const [didInit, setDidInit] = useState(false);
  const stripRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getAllLogs().then((all) => {
      setLogs(all);
      if (didInit) return;
      // Default active week to the latest week that has any logged plan workout
      const planLogs = all.filter((l) => logKind(l) === 'plan' && hasResults(l));
      let latestWeek = 1;
      for (const l of planLogs) {
        const d = l.dayId ? PLAN.days.find((dd) => dd.id === l.dayId) : undefined;
        if (d && d.week > latestWeek) latestWeek = d.week;
      }
      setActiveWeek(latestWeek);
      setDidInit(true);
    });
  }, [didInit]);

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
    <div>
      <div className="border-b border-line">
        <div ref={stripRef} className="flex gap-2 overflow-x-auto no-scrollbar px-3 py-2">
          {weeks.map(([w, ds]) => {
            const complete = weekIsComplete(ds);
            const active = w === activeWeek;
            return (
              <button
                key={w}
                data-week={w}
                onClick={() => setActiveWeek(w)}
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
                      <div className={`w-1 h-6 rounded-full bg-${CATEGORY_COLOR[d.category]}`} />
                      <span className="text-xs text-accent">{formatShortDate(l.date)}</span>
                      <span className={`text-[10px] font-semibold uppercase tracking-wider text-${CATEGORY_COLOR[d.category]} ml-auto`}>
                        {d.category.slice(0, 4)}
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
                  <div className={`w-1 h-12 rounded-full bg-${CATEGORY_COLOR[d.category]}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{DAY_LABEL[d.dayOfWeek]}</span>
                      <span className={`text-[10px] font-semibold uppercase tracking-wider text-${CATEGORY_COLOR[d.category]}`}>
                        {d.category}
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
    </div>
  );
}
