import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getActivePlans, getLog, newId, saveLog } from '../db';
import { todayISO } from '../dateUtils';
import {
  RUN_PRESETS,
  RUNNING_TYPE_ID,
  formatPace,
  keyPace,
  paceSecPerKm,
  presetDetail,
  repPaces,
  runDistanceKm,
  runPreset,
} from '../runs';
import type { RunDetail, RunPresetId, UserPlan, WorkoutLog } from '../types';
import TimeInput from '../components/TimeInput';
import FeltPicker, { type Felt } from '../components/FeltPicker';

export default function RunLogPage() {
  const [searchParams] = useSearchParams();
  const editingId = searchParams.get('id') ?? undefined;
  const nav = useNavigate();

  const [logId, setLogId] = useState<string>(() => editingId ?? newId());
  const [createdAt, setCreatedAt] = useState<number>(() => Date.now());
  const [date, setDate] = useState(searchParams.get('date') ?? todayISO());
  const [run, setRun] = useState<RunDetail>(() => presetDetail('run'));
  const [totalTimeSec, setTotalTimeSec] = useState<number | undefined>();
  const [felt, setFelt] = useState<Felt | undefined>();
  const [notes, setNotes] = useState('');
  const [planId, setPlanId] = useState<string | undefined>(searchParams.get('planId') ?? undefined);
  const [activePlans, setActivePlans] = useState<UserPlan[]>([]);

  useEffect(() => { getActivePlans().then(setActivePlans); }, []);

  useEffect(() => {
    if (!editingId) return;
    getLog(editingId).then((l) => {
      if (!l?.run) return;
      setLogId(l.id);
      setCreatedAt(l.createdAt);
      setDate(l.date);
      setRun(l.run);
      setTotalTimeSec(l.totalTimeSec);
      setFelt(l.feltLike);
      setNotes(l.notes ?? '');
      setPlanId(l.planId);
    });
  }, [editingId]);

  const preset = runPreset(run.preset);
  const kind = run.preset;
  const set = (patch: Partial<RunDetail>) => setRun((r) => ({ ...r, ...patch }));

  function pickPreset(id: RunPresetId) {
    if (id !== run.preset) setRun(presetDetail(id));
  }

  function setRepTime(i: number, v: number | undefined) {
    setRun((r) => {
      const times = [...(r.repTimesSec ?? [])];
      times[i] = v ?? null;
      return { ...r, repTimesSec: times };
    });
  }

  async function save() {
    const log: WorkoutLog = {
      id: logId,
      kind: 'custom',
      customName: preset.name,
      typeId: RUNNING_TYPE_ID,
      date,
      createdAt,
      status: 'logged',
      totalTimeSec,
      feltLike: felt,
      planId: planId || undefined,
      notes: notes || undefined,
      run: cleanRun(run),
    };
    await saveLog(log);
    nav(`/log/${log.id}?celebrate=1`);
  }

  const totalKm = runDistanceKm(run);
  const totalPace = paceSecPerKm(totalTimeSec, totalKm);
  const reps = repPaces(run);
  const repCount = run.reps ?? 0;

  return (
    <div className="pb-32">
      <div className="px-4 pt-3 pb-3 border-b border-line">
        <button onClick={() => nav(-1)} className="text-muted text-xs">← Back</button>
        <div className="mt-2 font-display text-xl">{editingId ? 'Edit run' : 'Log a run'}</div>
      </div>

      {/* Preset picker */}
      <section className="px-4 pt-4">
        <div className="flex flex-wrap gap-2">
          {RUN_PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => pickPreset(p.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider border ${
                run.preset === p.id ? 'bg-accent text-bg border-accent' : 'bg-transparent text-muted border-line'
              }`}
            >
              {p.chip}
            </button>
          ))}
        </div>
        <div className="mt-3 font-display text-2xl">{preset.name}</div>
        <div className="text-sm text-muted mt-0.5">{preset.cue}</div>
      </section>

      {/* Structure (adjustable) */}
      {kind === 'tempo' && (
        <section className="px-4 pt-5">
          <div className="text-xs uppercase tracking-widest text-accent">Structure</div>
          <div className="mt-2 grid grid-cols-3 gap-2">
            <NumField label="Warm-up km" decimal value={run.warmupKm} onChange={(v) => set({ warmupKm: v })} />
            <NumField label="Tempo km" decimal value={run.tempoKm} onChange={(v) => set({ tempoKm: v })} />
            <NumField label="Cool-down km" decimal value={run.cooldownKm} onChange={(v) => set({ cooldownKm: v })} />
          </div>
          <div className="mt-3 flex items-center justify-between bg-panel rounded px-3 py-2">
            <span className="text-sm">Tempo time</span>
            <div className="flex items-center gap-3">
              <PaceTag pace={paceSecPerKm(run.tempoTimeSec, run.tempoKm)} />
              <TimeInput compact placeholder valueSec={run.tempoTimeSec} onChange={(v) => set({ tempoTimeSec: v })} />
            </div>
          </div>
        </section>
      )}

      {(kind === 'intervals' || kind === 'timed') && (
        <section className="px-4 pt-5">
          <div className="text-xs uppercase tracking-widest text-accent">Structure</div>
          <div className="mt-2 grid grid-cols-3 gap-2">
            <NumField label="Reps" value={run.reps} onChange={(v) => set({ reps: v })} />
            {kind === 'intervals' ? (
              <NumField label="Rep (m)" value={run.repM} onChange={(v) => set({ repM: v })} />
            ) : (
              <TimeField label="Rep" value={run.repSec} onChange={(v) => set({ repSec: v })} />
            )}
            <TimeField label="Rest" value={run.restSec} onChange={(v) => set({ restSec: v })} />
          </div>
        </section>
      )}

      {kind === 'intervals' && repCount > 0 && (
        <section className="px-4 pt-5">
          <div className="text-xs uppercase tracking-widest text-accent">Rep times</div>
          <div className="mt-2 space-y-2">
            {Array.from({ length: repCount }, (_, i) => {
              const t = run.repTimesSec?.[i] ?? undefined;
              const km = (run.repM ?? 0) / 1000;
              return (
                <div key={i} className="flex items-center justify-between bg-panel rounded px-3 py-2">
                  <span className="text-sm">Rep {i + 1}</span>
                  <div className="flex items-center gap-3">
                    <PaceTag pace={paceSecPerKm(t, km)} />
                    <TimeInput compact placeholder valueSec={t} onChange={(v) => setRepTime(i, v)} />
                  </div>
                </div>
              );
            })}
          </div>
          {reps.length > 0 && (
            <div className="mt-2 text-xs text-muted text-right">
              Avg <span className="text-white/90 font-semibold">{formatPace(keyPace(run)!)}</span>
              {' · '}Best <span className="text-white/90 font-semibold">{formatPace(Math.min(...reps.map((r) => r.pace)))}</span>
            </div>
          )}
        </section>
      )}

      {/* Totals */}
      <section className="px-4 pt-5">
        <div className="text-xs uppercase tracking-widest text-accent">
          {kind === 'run' ? 'The run' : 'Total (incl. warm-up & recovery)'}
        </div>
        <div className="mt-2 grid grid-cols-3 gap-2 items-end">
          {kind === 'tempo' ? (
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted">Distance km</label>
              <div className="mt-1 bg-panel2 rounded px-2 py-1.5 text-center text-white/70">{totalKm ?? '—'}</div>
            </div>
          ) : (
            <NumField label="Distance km" decimal value={run.distanceKm} onChange={(v) => set({ distanceKm: v })} />
          )}
          <TimeField label="Time" value={totalTimeSec} onChange={setTotalTimeSec} />
          <div>
            <label className="text-[10px] uppercase tracking-wider text-muted">Pace</label>
            <div className="mt-1 rounded px-2 py-1.5 text-center font-semibold">
              {totalPace ? formatPace(totalPace) : '—'}
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 pt-6 space-y-4">
        <FeltPicker value={felt} onChange={setFelt} />

        <div>
          <label className="text-xs uppercase tracking-widest text-muted">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="block mt-1 bg-panel rounded px-3 py-2 w-full"
          />
        </div>

        {activePlans.length > 0 && (
          <div>
            <label className="text-xs uppercase tracking-widest text-muted">Part of a plan?</label>
            <select
              value={planId ?? ''}
              onChange={(e) => setPlanId(e.target.value || undefined)}
              className="block mt-1 bg-panel rounded px-3 py-2 w-full text-sm"
            >
              <option value="">Not part of a plan</option>
              {activePlans.map((p) => (
                <option key={p.id} value={p.id}>{p.icon ? `${p.icon} ` : ''}{p.name}</option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="text-xs uppercase tracking-widest text-muted">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="mt-1 w-full bg-panel rounded px-3 py-2 text-sm"
            placeholder="Route, weather, how the legs felt…"
          />
        </div>
      </section>

      <div className="fixed bottom-[calc(env(safe-area-inset-bottom)+56px)] left-0 right-0 bg-bg border-t border-line p-3">
        <button
          onClick={save}
          className="w-full bg-accent text-bg rounded-lg py-3 font-semibold uppercase tracking-wider"
        >
          {editingId ? 'Save changes' : 'Save run'}
        </button>
      </div>
    </div>
  );
}

// Keep only the fields the preset uses, and rep times for reps that exist.
function cleanRun(r: RunDetail): RunDetail {
  const base: RunDetail = { preset: r.preset };
  if (r.preset === 'run') return { ...base, distanceKm: r.distanceKm };
  if (r.preset === 'tempo') {
    return { ...base, warmupKm: r.warmupKm, tempoKm: r.tempoKm, cooldownKm: r.cooldownKm, tempoTimeSec: r.tempoTimeSec };
  }
  const out: RunDetail = { ...base, distanceKm: r.distanceKm, reps: r.reps, restSec: r.restSec };
  if (r.preset === 'timed') return { ...out, repSec: r.repSec };
  const times = (r.repTimesSec ?? []).slice(0, r.reps ?? 0).map((t) => t ?? null);
  return { ...out, repM: r.repM, repTimesSec: times.some((t) => t != null) ? times : undefined };
}

function PaceTag({ pace }: { pace?: number }) {
  return <span className="text-xs text-muted w-20 text-right">{pace ? formatPace(pace) : ''}</span>;
}

function TimeField({ label, value, onChange }: { label: string; value?: number; onChange: (v?: number) => void }) {
  return (
    <div>
      <label className="text-[10px] uppercase tracking-wider text-muted">{label}</label>
      <div className="mt-1">
        <TimeInput compact placeholder valueSec={value} onChange={onChange} />
      </div>
    </div>
  );
}

// Numeric entry that keeps the raw text while typing (so "5." survives) and
// resyncs when the value changes from outside (e.g. switching presets).
function NumField({ label, value, onChange, decimal }: {
  label: string;
  value?: number;
  onChange: (v?: number) => void;
  decimal?: boolean;
}) {
  const [text, setText] = useState(value != null ? String(value) : '');
  const parsed = text === '' ? undefined : parseFloat(text);
  if (parsed !== value && !(Number.isNaN(parsed) && value == null)) {
    setText(value != null ? String(value) : '');
  }

  return (
    <div>
      <label className="text-[10px] uppercase tracking-wider text-muted">{label}</label>
      <input
        type="text"
        inputMode={decimal ? 'decimal' : 'numeric'}
        className="mt-1 block w-full bg-panel2 rounded px-2 py-1.5 text-center"
        value={text}
        onChange={(e) => {
          const raw = e.target.value.replace(',', '.');
          if (!(decimal ? /^\d*\.?\d*$/ : /^\d*$/).test(raw)) return;
          setText(raw);
          const n = parseFloat(raw);
          onChange(raw === '' || isNaN(n) ? undefined : n);
        }}
      />
    </div>
  );
}
