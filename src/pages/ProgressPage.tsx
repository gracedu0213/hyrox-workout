import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAllLogs } from '../db';
import { formatSec } from '../format';
import { buildProgress, trend, type MetricUnit, type WorkoutProgress } from '../progress';
import { formatPace } from '../runs';
import Sparkline from '../components/Sparkline';
import type { WorkoutLog } from '../types';

function fmtValue(unit: MetricUnit, v: number): string {
  if (unit === 'time') return formatSec(v);
  if (unit === 'pace') return formatPace(v);
  if (unit === 'cal') return `${v} cal`;
  return `${v} rounds`;
}

function fmtDelta(unit: MetricUnit, delta: number): string {
  const sign = delta > 0 ? '+' : '−';
  const mag = Math.abs(delta);
  if (unit === 'time') return `${sign}${formatSec(mag)}`;
  if (unit === 'pace') return `${sign}${formatSec(mag)}/km`;
  if (unit === 'cal') return `${sign}${mag} cal`;
  return `${sign}${mag} rounds`;
}

export default function ProgressPage() {
  const [logs, setLogs] = useState<WorkoutLog[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => { getAllLogs().then(setLogs); }, []);

  const progress = useMemo(() => buildProgress(logs), [logs]);

  return (
    <div className="pb-8">
      <div className="px-4 pt-5 pb-3">
        <h1 className="font-display text-5xl leading-[0.9] tracking-[-0.03em]">
          <span
            className="bg-clip-text text-transparent"
            style={{ backgroundImage: 'linear-gradient(135deg, #FFD500 0%, #F0E040 35%, #FF9B5C 70%, #FF6B6B 100%)' }}
          >
            Progress
          </span>
        </h1>
        <p className="text-sm text-muted mt-2">How your results are trending, workout by workout.</p>
      </div>

      {progress.length === 0 ? (
        <div className="px-4 mt-8 text-center">
          <div className="text-4xl">📈</div>
          <p className="text-sm text-muted mt-3">
            Log the same workout at least twice and your progression shows up here —
            time, rounds, and reps over time.
          </p>
        </div>
      ) : (
        <ul className="px-4 space-y-2">
          {progress.map((p) => (
            <ProgressRow
              key={p.key}
              p={p}
              open={expanded === p.key}
              onToggle={() => setExpanded(expanded === p.key ? null : p.key)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function ProgressRow({ p, open, onToggle }: { p: WorkoutProgress; open: boolean; onToggle: () => void }) {
  const latest = p.points[p.points.length - 1].value;
  const t = trend(p);
  const trendColor = t.improved == null ? 'text-muted' : t.improved ? 'text-[#2ECC71]' : 'text-[#FF6B6B]';
  const arrow = t.improved == null ? '→' : t.improved ? '↑' : '↓';

  return (
    <li className="bg-panel rounded-lg overflow-hidden">
      <button onClick={onToggle} className="w-full flex items-center gap-3 p-3 text-left active:bg-panel2">
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-sm truncate">{p.name}</div>
          <div className="text-xs text-muted mt-0.5">
            {p.points.length} sessions · latest <span className="text-white/80">{fmtValue(p.unit, latest)}</span>
          </div>
        </div>
        <Sparkline values={p.points.map((pt) => pt.value)} />
        <div className={`text-xs font-semibold shrink-0 w-16 text-right ${trendColor}`}>
          {t.improved == null ? '—' : `${fmtDelta(p.unit, t.delta)} ${arrow}`}
        </div>
      </button>

      {open && (
        <div className="px-3 pb-3">
          <div className="bg-panel2 rounded-lg p-3">
            <Sparkline values={p.points.map((pt) => pt.value)} width={320} height={130} detailed />
            <div className="flex justify-between text-[10px] text-muted mt-1.5">
              <span>{p.points[0].date}</span>
              <span>{p.points[p.points.length - 1].date}</span>
            </div>
          </div>
          <ul className="mt-2 space-y-1">
            {[...p.points].reverse().map((pt) => (
              <li key={pt.logId}>
                <Link to={`/log/${pt.logId}`} className="flex items-center justify-between text-sm py-1 active:opacity-70">
                  <span className="text-muted text-xs">{pt.date}</span>
                  <span className="text-white/85">{fmtValue(p.unit, pt.value)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </li>
  );
}
