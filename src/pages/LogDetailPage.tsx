import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { byId, CATEGORY_COLOR, DAY_LABEL } from '../plan';
import { deleteLog, getLog } from '../db';
import { formatExercise, formatSec, setupSummary } from '../format';
import ResultHero from '../components/ResultHero';
import CelebrationScreen from '../components/CelebrationScreen';
import { logKind } from '../logSummary';
import { useProfile } from '../profile';
import { celebrate } from '../celebrate';
import type { WorkoutLog } from '../types';

export default function LogDetailPage() {
  const { logId } = useParams<{ logId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [log, setLog] = useState<WorkoutLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [celebrated, setCelebrated] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const firedRef = useRef(false);
  const nav = useNavigate();
  const { profile } = useProfile();
  const gender = profile?.gender;

  useEffect(() => {
    if (!logId) return;
    getLog(logId).then((l) => {
      setLog(l ?? null);
      setLoading(false);
    });
  }, [logId]);

  useEffect(() => {
    if (loading || !log) return;
    if (searchParams.get('celebrate') !== '1') return;
    if (firedRef.current) return;
    firedRef.current = true;
    celebrate();
    setCelebrated(true);
    // Strip the query so a refresh doesn't re-fire.
    const next = new URLSearchParams(searchParams);
    next.delete('celebrate');
    setSearchParams(next, { replace: true });
  }, [loading, log, searchParams, setSearchParams]);

  if (loading) return <div className="p-4 text-muted">Loading…</div>;
  if (!log) return (
    <div className="p-4">
      <p>Log not found.</p>
      <Link to="/" className="text-accent underline">Back to overview</Link>
    </div>
  );

  const kind = logKind(log);
  const planDay = log.dayId ? byId(log.dayId) : undefined;
  const editPath =
    kind === 'plan' && planDay
      ? `/plan/${planDay.id}/log?id=${log.id}`
      : kind === 'custom'
        ? log.workoutId
          ? `/workout/${log.workoutId}/log?id=${log.id}`
          : `/custom/log?id=${log.id}`
        : null;


  async function onDelete() {
    if (!log) return;
    if (!confirm('Delete this log? Cannot be undone.')) return;
    await deleteLog(log.id);
    nav('/');
  }

  return (
    <div className="pb-8">
      {celebrated && (
        <CelebrationScreen log={log} onDismiss={() => { setCelebrated(false); nav('/'); }} />
      )}
      <div className="px-4 pt-3 pb-4 border-b border-line">
        <button onClick={() => nav(-1)} className="text-muted text-xs">← Back</button>
        <div className="mt-2">
          <div className="text-[10px] uppercase tracking-[0.25em] text-muted font-semibold">{log.date}</div>
          {kind === 'rest' && <div className="font-display text-3xl mt-1.5 tracking-[-0.02em]">🛌 Rest day</div>}
          {kind === 'custom' && <div className="font-display text-3xl mt-1.5 tracking-[-0.02em]">{log.customName}</div>}
          {kind === 'plan' && planDay && (
            <>
              <div className="flex items-baseline gap-2 mt-1.5 flex-wrap">
                <span className="font-display text-3xl tracking-[-0.02em]">W{planDay.week} · {DAY_LABEL[planDay.dayOfWeek]}</span>
                <span className={`text-[10px] font-black uppercase tracking-widest text-${CATEGORY_COLOR[planDay.category]}`}>
                  {planDay.category}
                </span>
              </div>
              <div className="text-base text-white/90 mt-1">{planDay.workoutLabel}</div>
              <div className="text-xs text-muted mt-0.5">{setupSummary(planDay.setup)}</div>
            </>
          )}
        </div>
      </div>

      {/* Result hero */}
      {kind !== 'rest' && (
        <div className="border-b border-line">
          <ResultHero log={log} size="page" />
        </div>
      )}

      {/* Round splits */}
      {log.roundSplits && log.roundSplits.length > 0 && (
        <Section title="Round splits">
          <ul className="space-y-1 text-sm">
            {log.roundSplits.map((r) => (
              <li key={r.roundIndex} className="flex justify-between bg-panel rounded px-3 py-1.5">
                <span>Round {r.roundIndex + 1}</span>
                <span className="font-mono">{r.splitSec != null ? formatSec(r.splitSec) : '—'}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* AMRAP */}
      {log.amrap && (log.amrap.fullRounds != null || log.amrap.partialReps != null || log.amrap.totalCalories != null) && (
        <Section title="AMRAP result">
          <div className="text-sm space-y-1">
            {log.amrap.fullRounds != null && <div>Rounds: <b>{log.amrap.fullRounds}</b></div>}
            {log.amrap.partialReps != null && <div>Partial reps: <b>{log.amrap.partialReps}</b></div>}
            {log.amrap.totalCalories != null && <div>Total cals: <b>{log.amrap.totalCalories}</b></div>}
          </div>
        </Section>
      )}

      {/* Multi-window AMRAP */}
      {log.amrap?.perWindow && (
        <Section title="Per window">
          <ul className="space-y-2 text-sm">
            {log.amrap.perWindow.map((w, i) => (
              <li key={i} className="bg-panel rounded p-2">
                <div className="text-xs text-muted">{w.label}</div>
                <div className="text-sm">
                  {(w.fullRounds ?? '—')} rounds + {(w.partialReps ?? 0)} reps
                </div>
                {w.note && <div className="text-xs text-muted italic mt-1">{w.note}</div>}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Intervals */}
      {log.intervals && log.intervals.splits.length > 0 && (
        <Section title="Per interval">
          <ul className="space-y-1 text-sm">
            {log.intervals.splits.map((s) => (
              <li key={s.roundIndex} className="flex justify-between bg-panel rounded px-3 py-1.5">
                <span>Interval {s.roundIndex + 1}</span>
                <span className="font-mono text-xs">
                  {[
                    s.reps != null ? `${s.reps} reps` : null,
                    s.cal != null ? `${s.cal} cal` : null,
                    s.valueSec != null ? formatSec(s.valueSec) : null,
                  ].filter(Boolean).join(' · ')}
                </span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Exercises (weights used) */}
      {log.exercises && log.exercises.length > 0 && (
        <Section title="Weights used">
          <ul className="space-y-1 text-sm">
            {log.exercises.map((e, i) => (
              <li key={i} className="bg-panel rounded px-3 py-2">
                <div className="text-sm">{e.exerciseName}</div>
                {e.weightUsed && <div className="text-xs text-accent mt-0.5">{e.weightUsed}</div>}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {(log.notes || log.modifications) && (
        <Section title="Notes">
          {log.notes && <p className="text-sm whitespace-pre-wrap">{log.notes}</p>}
          {log.modifications && (
            <p className="text-sm text-muted italic mt-2 whitespace-pre-wrap">Mod: {log.modifications}</p>
          )}
        </Section>
      )}

      {/* Custom workout structure (from the self-contained snapshot) */}
      {kind === 'custom' && log.workoutSnapshot && (
        <Section title="Workout">
          <div className="text-sm text-muted mb-2">{setupSummary(log.workoutSnapshot.setup)}</div>
          <ul className="space-y-1.5 text-sm">
            {log.workoutSnapshot.exercises.map((ex, i) => {
              const isSep = ex.name.startsWith('—');
              return (
                <li
                  key={i}
                  className={isSep ? 'text-xs uppercase tracking-wider text-muted pt-1' : 'text-white/90'}
                >
                  {isSep ? ex.name : `• ${formatExercise(ex)}`}
                </li>
              );
            })}
          </ul>
        </Section>
      )}

      {/* Prescribed workout — collapsed by default since the result is the
          focus on this page. Tap to remember what the workout itself was. */}
      {planDay && (
        <>
          <div className="px-4 pt-4">
            <button
              onClick={() => setShowDetails((v) => !v)}
              className="w-full flex items-center justify-between bg-panel rounded-lg px-4 py-3 text-sm font-semibold active:bg-panel2"
              aria-expanded={showDetails}
            >
              <span>{showDetails ? 'Hide the workout' : 'See the workout'}</span>
              <span className={`text-accent transition-transform ${showDetails ? 'rotate-180' : ''}`}>▼</span>
            </button>
          </div>
          {showDetails && (
            <Section title="Workout">
              <div className="text-sm text-muted mb-2">{setupSummary(planDay.setup)}</div>
              {planDay.setup.type === 'descending_rounds' && planDay.setup.roundDetails && (
                <ul className="text-sm text-white/80 space-y-1 mb-3">
                  {planDay.setup.roundDetails.map((r, i) => <li key={i}>• {r}</li>)}
                </ul>
              )}
              {planDay.setup.type === 'multi_window_amrap' && (
                <ul className="text-sm text-white/80 space-y-1 mb-3">
                  {planDay.setup.windows.map((w, i) => <li key={i}>• {w.label}</li>)}
                </ul>
              )}
              <ul className="space-y-1.5 text-sm">
                {planDay.exercises.map((ex, i) => {
                  const isSep = ex.name.startsWith('—');
                  return (
                    <li
                      key={i}
                      className={
                        isSep
                          ? 'text-xs uppercase tracking-wider text-muted pt-1'
                          : 'text-white/90'
                      }
                    >
                      {isSep ? ex.name : `• ${formatExercise(ex, { gender })}`}
                    </li>
                  );
                })}
              </ul>
            </Section>
          )}
        </>
      )}

      <section className="px-4 py-4 flex gap-2">
        {editPath && (
          <Link to={editPath} className="flex-1 text-center bg-accent text-bg rounded py-2 text-sm font-semibold uppercase tracking-wider">
            Edit
          </Link>
        )}
        <button onClick={onDelete} className="px-4 bg-panel border border-line text-muted rounded py-2 text-sm uppercase tracking-wider">
          Delete
        </button>
      </section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="px-4 py-4 border-b border-line">
      <div className="text-xs uppercase tracking-widest text-accent mb-2">{title}</div>
      {children}
    </section>
  );
}
