import { useMemo } from 'react';
import { cellState } from './CalendarCell';
import { isoDate, mondayOfWeek } from '../dateUtils';
import type { WorkoutLog } from '../types';

// Compact HabitKit/GitHub-style activity grid for the Overview: columns are
// Mon-first weeks (oldest → newest), rows are Mon…Sun. A single warm color with
// intensity-by-session-count reads as "did I show up" at a glance. Tap a tile to
// browse that day's sessions.
const WEEKS = 10;

function tileStyle(variant: string, count: number, future: boolean): React.CSSProperties {
  if (future) return { backgroundColor: 'rgba(255,255,255,0.02)' };
  switch (variant) {
    case 'logged-plan':
    case 'logged-custom':
      // 1 session = warm; 2+ = full intensity.
      return { backgroundColor: count > 1 ? '#FF6B6B' : 'rgba(255,107,107,0.55)' };
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
}: {
  logs: WorkoutLog[];
  selected?: string | null;
  onSelect?: (dateISO: string) => void;
}) {
  const byDate = useMemo(() => {
    const m = new Map<string, WorkoutLog[]>();
    for (const l of logs) {
      if (!m.has(l.date)) m.set(l.date, []);
      m.get(l.date)!.push(l);
    }
    return m;
  }, [logs]);

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

  return (
    <div className="flex gap-1">
      {columns.map((col, ci) => (
        <div key={ci} className="flex flex-1 flex-col gap-1">
          {col.map((date, ri) => {
            const ds = isoDate(date);
            const { variant } = cellState(byDate.get(ds) ?? []);
            const count = byDate.get(ds)?.length ?? 0;
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
                style={tileStyle(variant, count, future)}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}
