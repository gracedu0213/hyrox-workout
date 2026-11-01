import { useMemo } from 'react';
import { isoDate, mondayOfWeek } from '../dateUtils';
import { groupLogsByDate, hasResults, logKind } from '../logSummary';
import type { TypeResolver } from '../logTypeColor';
import TypeLegend from './TypeLegend';
import { OTHER_TYPE } from '../tags';
import type { WorkoutLog } from '../types';

// Compact HabitKit/GitHub-style activity grid: columns are Mon-first weeks
// (oldest → newest), rows are Mon…Sun. Logged tiles fill with the session's
// workout-type color; a day mixing 2+ types splits the tile into equal
// segments. Tap a tile to browse that day's sessions. The sibling MonthCalendar
// shows the same data with per-session dots.
const WEEKS = 10;

type DayVariant = 'logged' | 'rest' | 'planned' | 'empty';

// What a day amounts to, in priority order: a logged session always wins over
// a rest or planned marker on the same day.
function dayVariant(logs: WorkoutLog[]): DayVariant {
  if (logs.some((l) => logKind(l) !== 'rest' && hasResults(l))) return 'logged';
  if (logs.some((l) => logKind(l) === 'rest')) return 'rest';
  if (logs.some((l) => logKind(l) !== 'rest' && !hasResults(l))) return 'planned';
  return 'empty';
}

function typedTileStyle(dayLogs: WorkoutLog[], typeOf: TypeResolver): React.CSSProperties {
  const colors = [...new Set(
    dayLogs
      .filter((l) => hasResults(l) && logKind(l) !== 'rest')
      .map((l) => (typeOf(l) ?? OTHER_TYPE).color),
  )];
  if (colors.length <= 1) return { backgroundColor: colors[0] ?? OTHER_TYPE.color };
  const step = 100 / colors.length;
  const stops = colors.map((c, i) => `${c} ${i * step}% ${(i + 1) * step}%`).join(', ');
  return { background: `linear-gradient(90deg, ${stops})` };
}

function tileStyle(
  dayLogs: WorkoutLog[],
  future: boolean,
  typeOf: TypeResolver,
): React.CSSProperties {
  if (future) return { backgroundColor: 'rgba(255,255,255,0.02)' };
  switch (dayVariant(dayLogs)) {
    case 'logged':
      return typedTileStyle(dayLogs, typeOf);
    case 'rest':
      return { backgroundColor: 'rgba(255,255,255,0.13)' };
    case 'planned':
      return { backgroundColor: 'transparent', border: '1px dashed rgba(255,255,255,0.22)' };
    default:
      return { backgroundColor: 'rgba(255,255,255,0.05)' };
  }
}

export default function ConsistencyHeatmap({
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
  const byDate = useMemo(() => groupLogsByDate(logs), [logs]);

  const today = isoDate(new Date());
  const columns = useMemo(() => {
    const start = mondayOfWeek(new Date());
    start.setDate(start.getDate() - (WEEKS - 1) * 7);
    const cols: Date[][] = [];
    for (let w = 0; w < WEEKS; w++) {
      const col: Date[] = [];
      for (let d = 0; d < 7; d++) {
        const cell = new Date(start);
        cell.setDate(cell.getDate() + w * 7 + d);
        col.push(cell);
      }
      cols.push(col);
    }
    return cols;
  }, []);

  const firstDay = isoDate(columns[0][0]);
  const visibleLogs = useMemo(() => logs.filter((l) => l.date >= firstDay && l.date <= today), [logs, firstDay, today]);

  return (
    <div>
      <div className="flex gap-1">
        {columns.map((col, ci) => (
          <div key={ci} className="flex flex-1 flex-col gap-1">
            {col.map((date, ri) => {
              const ds = isoDate(date);
              const future = ds > today;
              const isSel = selected === ds;
              return (
                <button
                  key={ri}
                  type="button"
                  disabled={future || !onSelect}
                  onClick={() => onSelect?.(ds)}
                  className={`aspect-square rounded-[3px] ${ds === today ? 'ring-1 ring-accent ring-inset' : ''} ${
                    isSel ? 'ring-2 ring-white ring-inset' : ''
                  }`}
                  style={tileStyle(byDate.get(ds) ?? [], future, typeOf)}
                />
              );
            })}
          </div>
        ))}
      </div>
      {legend && <TypeLegend logs={visibleLogs} typeOf={typeOf} />}
    </div>
  );
}
