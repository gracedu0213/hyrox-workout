import { useMemo, useState } from 'react';
import { isoDate, todayISO } from '../dateUtils';
import { groupLogsByDate, hasResults, logKind } from '../logSummary';
import type { TypeResolver } from '../logTypeColor';
import TypeLegend from './TypeLegend';
import { OTHER_TYPE } from '../tags';
import type { WorkoutLog } from '../types';

// Strava-style month view: one dot per logged session, colored by workout
// type; dashed dot = planned, dim dot = rest. Page months with ‹ ›. The
// sibling ConsistencyHeatmap shows the same data as a compact 10-week grid.

const DOW = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const MAX_DOTS = 3;

export default function MonthCalendar({
  logs,
  selected,
  onSelect,
  typeOf,
  legend = false,
}: {
  logs: WorkoutLog[];
  selected?: string | null;
  onSelect?: (dateISO: string) => void;
  typeOf: TypeResolver;
  legend?: boolean;
}) {
  // Months back from the current month; can't navigate into the future.
  const [offset, setOffset] = useState(0);
  const today = todayISO();

  const byDate = useMemo(() => groupLogsByDate(logs), [logs]);

  const first = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() - offset, 1);
  }, [offset]);
  const monthLabel = first.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const monthPrefix = isoDate(first).slice(0, 7);
  const monthLogs = useMemo(() => logs.filter((l) => l.date.startsWith(monthPrefix)), [logs, monthPrefix]);

  // Mon-first week rows covering the month; days outside it render as blanks.
  const weeks = useMemo(() => {
    const start = new Date(first);
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
    const rows: Date[][] = [];
    const cursor = new Date(start);
    do {
      const row: Date[] = [];
      for (let i = 0; i < 7; i++) {
        row.push(new Date(cursor));
        cursor.setDate(cursor.getDate() + 1);
      }
      rows.push(row);
    } while (cursor.getMonth() === first.getMonth());
    return rows;
  }, [first]);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <button
          type="button"
          onClick={() => setOffset((o) => o + 1)}
          className="px-3 py-1 text-muted text-sm"
          aria-label="Previous month"
        >
          ‹
        </button>
        <span className="text-[11px] uppercase tracking-widest text-muted">{monthLabel}</span>
        <button
          type="button"
          onClick={() => setOffset((o) => Math.max(0, o - 1))}
          disabled={offset === 0}
          className="px-3 py-1 text-muted text-sm disabled:opacity-30"
          aria-label="Next month"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {DOW.map((d) => (
          <div key={d} className="text-center text-[9px] uppercase tracking-wider text-muted/70">{d}</div>
        ))}
        {weeks.flat().map((date, i) => {
          if (date.getMonth() !== first.getMonth()) return <div key={i} />;
          const ds = isoDate(date);
          const dayLogs = byDate.get(ds) ?? [];
          const future = ds > today;
          const sessions = dayLogs.filter((l) => hasResults(l) && logKind(l) !== 'rest');
          const planned = sessions.length === 0 && dayLogs.some((l) => !hasResults(l) && logKind(l) !== 'rest');
          const rest = sessions.length === 0 && dayLogs.some((l) => logKind(l) === 'rest');
          const isSel = selected === ds;
          return (
            <button
              key={i}
              type="button"
              disabled={future || !onSelect}
              onClick={() => onSelect?.(ds)}
              className={`h-11 rounded-md flex flex-col items-center justify-center gap-1 ${
                isSel ? 'bg-panel2 ring-2 ring-white ring-inset' : ds === today ? 'ring-1 ring-accent ring-inset' : ''
              }`}
            >
              <span className={`text-[11px] leading-none tabular-nums ${future ? 'text-muted/40' : 'text-white/80'}`}>
                {date.getDate()}
              </span>
              <span className="flex items-center gap-0.5 h-1.5">
                {sessions.slice(0, MAX_DOTS).map((l, j) => (
                  <span
                    key={j}
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: (typeOf(l) ?? OTHER_TYPE).color }}
                  />
                ))}
                {sessions.length > MAX_DOTS && <span className="text-[8px] text-muted leading-none">+</span>}
                {planned && (
                  <span className="w-1.5 h-1.5 rounded-full border border-dashed border-white/40" />
                )}
                {rest && <span className="w-1.5 h-1.5 rounded-full bg-white/20" />}
              </span>
            </button>
          );
        })}
      </div>
      {legend && <TypeLegend logs={monthLogs} typeOf={typeOf} />}
    </div>
  );
}
