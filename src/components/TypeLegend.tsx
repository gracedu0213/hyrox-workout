import { hasResults, logKind } from '../logSummary';
import type { TypeResolver } from '../logTypeColor';
import { OTHER_TYPE } from '../tags';
import type { WorkoutLog, WorkoutType } from '../types';

// Key for a calendar: only the types that appear in `logs` (the calendar's
// visible range), in type-list order — HYROX, user types oldest first, Other.
export default function TypeLegend({ logs, typeOf }: { logs: WorkoutLog[]; typeOf: TypeResolver }) {
  const seen = new Map<string, WorkoutType>();
  for (const l of logs) {
    if (!hasResults(l) || logKind(l) === 'rest') continue;
    const t = typeOf(l) ?? OTHER_TYPE;
    seen.set(t.id, t);
  }
  const types = [...seen.values()].sort((a, b) => a.createdAt - b.createdAt);
  if (types.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 mt-3">
      {types.map((t) => (
        <span key={t.id} className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted">
          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: t.color }} />
          {t.name}
        </span>
      ))}
    </div>
  );
}
