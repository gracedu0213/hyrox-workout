import { Link } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { getAllLogs } from '../db';
import { byId, CATEGORY_COLOR, DAY_LABEL } from '../plan';
import { hasResults, logKind, logSummary } from '../logSummary';
import { FELT_EMOJI } from '../components/FeltPicker';
import type { Category, WorkoutLog } from '../types';

// Hex values matching tailwind.config.js — used inline because tailwind's JIT
// can't see dynamic classes derived from data.
const CAT_HEX: Record<Category, string> = {
  FOUNDATION: '#F0E040',
  AEROBIC: '#5BC0EB',
  ENGINE: '#FF6B6B',
  POWER: '#9B59B6',
  COMPLETE: '#2ECC71',
};

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function addMonths(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}
function isoDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const WEEK_HEAD = ['M', 'T', 'W', 'T', 'F', 'S', 'S']; // Mon-first

export default function HistoryPage() {
  const [logs, setLogs] = useState<WorkoutLog[]>([]);
  const [cursor, setCursor] = useState<Date>(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  useEffect(() => { getAllLogs().then(setLogs); }, []);

  const logsByDate = useMemo(() => {
    const m = new Map<string, WorkoutLog[]>();
    for (const l of logs) {
      if (!m.has(l.date)) m.set(l.date, []);
      m.get(l.date)!.push(l);
    }
    return m;
  }, [logs]);

  const days = useMemo(() => buildMonthGrid(cursor), [cursor]);
  const selectedLogs = selectedDate ? logsByDate.get(selectedDate) ?? [] : [];

  return (
    <div className="pb-8">
      <div className="px-4 pt-5 pb-3">
        <h1 className="font-display text-5xl leading-[0.9] tracking-[-0.03em]">
          <span
            className="bg-clip-text text-transparent"
            style={{ backgroundImage: 'linear-gradient(135deg, #FFD500 0%, #F0E040 35%, #FF9B5C 70%, #FF6B6B 100%)' }}
          >
            History
          </span>
        </h1>
      </div>

      <div className="px-4 flex items-center justify-between">
        <button
          onClick={() => setCursor(addMonths(cursor, -1))}
          className="px-3 py-1 text-sm text-muted"
        >‹ Prev</button>
        <div className="font-semibold">{MONTH_NAMES[cursor.getMonth()]} {cursor.getFullYear()}</div>
        <button
          onClick={() => setCursor(addMonths(cursor, 1))}
          className="px-3 py-1 text-sm text-muted"
        >Next ›</button>
      </div>

      <div className="px-4 mt-3">
        <div className="grid grid-cols-7 text-[10px] uppercase tracking-widest text-muted font-semibold text-center pb-1.5">
          {WEEK_HEAD.map((d, i) => <div key={i}>{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((cell, i) => {
            if (!cell) return <div key={i} className="aspect-square" />;
            const dateStr = isoDate(cell);
            const dayLogs = logsByDate.get(dateStr) ?? [];
            const isToday = dateStr === isoDate(new Date());
            const isSelected = dateStr === selectedDate;
            return (
              <CalendarCell
                key={i}
                date={cell}
                logs={dayLogs}
                isToday={isToday}
                isSelected={isSelected}
                onClick={() => setSelectedDate(dateStr === selectedDate ? null : dateStr)}
              />
            );
          })}
        </div>
      </div>

      <section className="px-4 mt-5">
        {selectedDate ? (
          <>
            <div className="text-xs uppercase tracking-widest text-accent">{selectedDate}</div>
            {selectedLogs.length === 0 ? (
              <p className="text-sm text-muted mt-2">No logs on this day.</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {selectedLogs.map((l) => <LogRow key={l.id} log={l} />)}
              </ul>
            )}
          </>
        ) : (
          <p className="text-sm text-muted">Tap a date to see what you did.</p>
        )}
      </section>

      {/* All recent (most recent first), regardless of selection */}
      {!selectedDate && (
        <section className="px-4 mt-5">
          <div className="text-xs uppercase tracking-widest text-muted mb-2">Recent</div>
          {logs.length === 0 ? (
            <p className="text-sm text-muted">No logs yet.</p>
          ) : (
            <ul className="space-y-2">
              {logs.slice(0, 10).map((l) => <LogRow key={l.id} log={l} showDate />)}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}

function buildMonthGrid(monthStart: Date): (Date | null)[] {
  const year = monthStart.getFullYear();
  const month = monthStart.getMonth();
  const firstDay = new Date(year, month, 1);
  // Monday-first index (0..6)
  const firstWeekday = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

type CellState =
  | { variant: 'empty' }
  | { variant: 'logged-plan'; color: string; emoji: string }
  | { variant: 'logged-custom'; emoji: string }
  | { variant: 'rest' }
  | { variant: 'planned'; color: string };

// Default stamp when a workout was logged but no felt-rating was recorded —
// keeps the cell from feeling empty.
const DEFAULT_DONE_EMOJI = '💪';

function cellState(logs: WorkoutLog[]): CellState {
  if (logs.length === 0) return { variant: 'empty' };
  // Priority: a logged workout always wins over a rest or planned marker on
  // the same day, so the cell shows the most meaningful state at a glance.
  const loggedPlan = logs.find((l) => logKind(l) === 'plan' && hasResults(l));
  if (loggedPlan) {
    const d = loggedPlan.dayId ? byId(loggedPlan.dayId) : undefined;
    const emoji = loggedPlan.feltLike ? FELT_EMOJI[loggedPlan.feltLike] : DEFAULT_DONE_EMOJI;
    return { variant: 'logged-plan', color: d ? CAT_HEX[d.category] : '#F0E040', emoji };
  }
  const loggedCustom = logs.find((l) => logKind(l) === 'custom' && hasResults(l));
  if (loggedCustom) {
    const emoji = loggedCustom.feltLike ? FELT_EMOJI[loggedCustom.feltLike] : DEFAULT_DONE_EMOJI;
    return { variant: 'logged-custom', emoji };
  }
  if (logs.find((l) => logKind(l) === 'rest')) {
    return { variant: 'rest' };
  }
  const plannedPlan = logs.find((l) => logKind(l) === 'plan' && !hasResults(l));
  if (plannedPlan) {
    const d = plannedPlan.dayId ? byId(plannedPlan.dayId) : undefined;
    return { variant: 'planned', color: d ? CAT_HEX[d.category] : '#F0E040' };
  }
  return { variant: 'empty' };
}

function CalendarCell({
  date,
  logs,
  isToday,
  isSelected,
  onClick,
}: {
  date: Date;
  logs: WorkoutLog[];
  isToday: boolean;
  isSelected: boolean;
  onClick: () => void;
}) {
  const state = cellState(logs);
  const count = logs.length;

  // Selected wins: invert to accent for unambiguous tap feedback.
  const cellStyle: React.CSSProperties = isSelected
    ? {}
    : state.variant === 'logged-plan'
      ? { backgroundColor: `${state.color}26`, border: `1px solid ${state.color}99` }
      : state.variant === 'logged-custom'
        ? { backgroundColor: 'rgba(244,244,244,0.10)', border: '1px solid rgba(244,244,244,0.45)' }
        : state.variant === 'rest'
          ? { backgroundColor: '#2a2a2a' }
          : state.variant === 'planned'
            ? { border: `1px dashed ${state.color}80` }
            : { backgroundColor: '#222' };

  return (
    <button
      onClick={onClick}
      className={`aspect-square relative rounded-md overflow-hidden text-left ${
        isSelected ? 'bg-accent text-bg' : 'text-white/90'
      } ${isToday ? 'ring-2 ring-accent ring-inset' : ''}`}
      style={cellStyle}
    >
      <span className="absolute top-1 left-1.5 font-display text-[15px] leading-none tracking-tight">
        {date.getDate()}
      </span>

      {(state.variant === 'logged-plan' || state.variant === 'logged-custom') && (
        <span className="absolute bottom-0 right-0.5 text-base leading-none rotate-[10deg] select-none">
          {state.emoji}
        </span>
      )}

      {state.variant === 'rest' && (
        <span className="absolute inset-0 flex items-center justify-center text-lg rotate-[-8deg] opacity-95 select-none">
          🛌
        </span>
      )}

      {count > 1 && (
        <span
          className={`absolute top-0.5 right-1 text-[8px] font-bold ${
            isSelected ? 'text-bg/70' : 'text-muted'
          }`}
        >
          +{count - 1}
        </span>
      )}
    </button>
  );
}

function LogRow({ log, showDate }: { log: WorkoutLog; showDate?: boolean }) {
  const kind = logKind(log);
  if (kind === 'rest') {
    return (
      <li className="bg-panel rounded p-3 flex items-center gap-3">
        <span className="text-2xl">🛌</span>
        <div className="flex-1">
          {showDate && <div className="text-xs text-muted">{log.date}</div>}
          <div className="text-sm">Rest day</div>
        </div>
      </li>
    );
  }
  if (kind === 'custom') {
    return (
      <li>
        <Link to={`/log/${log.id}`} className="block bg-panel rounded p-3">
          <div className="flex justify-between items-center">
            {showDate && <span className="text-xs text-muted">{log.date}</span>}
            <ResultChip log={log} />
          </div>
          <div className="text-sm font-semibold mt-1">Custom · {log.customName}</div>
        </Link>
      </li>
    );
  }
  const d = log.dayId ? byId(log.dayId) : undefined;
  if (!d) return null;
  return (
    <li>
      <Link to={`/log/${log.id}`} className="block bg-panel rounded p-3">
        <div className="flex items-center gap-3">
          <div className={`w-1 h-10 rounded-full bg-${CATEGORY_COLOR[d.category]}`} />
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-center">
              {showDate && <span className="text-xs text-muted">{log.date}</span>}
              <ResultChip log={log} />
            </div>
            <div className="text-sm truncate mt-0.5">W{d.week} {DAY_LABEL[d.dayOfWeek]} · {d.workoutLabel}</div>
          </div>
        </div>
      </Link>
    </li>
  );
}

function ResultChip({ log }: { log: WorkoutLog }) {
  const empty = log.status === 'planned' && !hasResults(log);
  if (empty) {
    return <span className="text-[10px] uppercase tracking-wider text-muted">Planned</span>;
  }
  const summary = logSummary(log);
  return (
    <span
      className="font-display text-lg leading-none tracking-tight bg-clip-text text-transparent"
      style={{ backgroundImage: 'linear-gradient(135deg, #FFD500 0%, #F0E040 35%, #FF9B5C 70%, #FF6B6B 100%)' }}
    >
      {summary || 'Logged'}
    </span>
  );
}
