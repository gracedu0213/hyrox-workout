// Preset running workouts: the standard session types (easy, long, tempo,
// intervals…) with sensible defaults the user tweaks at log time. Each preset
// has a shape that decides which fields the run log asks for.

import { formatSec } from './format';
import type { RunDetail, RunPresetId } from './types';

export type RunShape = 'steady' | 'tempo' | 'distance_reps' | 'timed_reps';

export interface RunPreset {
  id: RunPresetId;
  chip: string;  // short label for the picker
  name: string;  // log title
  shape: RunShape;
  cue: string;   // how it should feel
  defaults: Omit<RunDetail, 'preset'>;
}

export const RUNNING_TYPE_ID = 'type-running';

export const RUN_PRESETS: RunPreset[] = [
  { id: 'run', chip: 'Run', name: 'Run', shape: 'steady', cue: 'A continuous run — easy, long, or anything in between', defaults: { distanceKm: 5 } },
  { id: 'tempo', chip: 'Tempo', name: 'Tempo run', shape: 'tempo', cue: 'Comfortably hard — about the pace you could hold for an hour', defaults: { warmupKm: 1.5, tempoKm: 4, cooldownKm: 1.5 } },
  { id: 'intervals', chip: 'Intervals', name: 'Intervals', shape: 'distance_reps', cue: '5K effort on the reps, jog the recovery', defaults: { reps: 6, repM: 800, restSec: 90 } },
  { id: 'km_repeats', chip: '1 km repeats', name: '1 km repeats', shape: 'distance_reps', cue: 'HYROX race pace — hold it even across every rep', defaults: { reps: 5, repM: 1000, restSec: 120 } },
  { id: 'hills', chip: 'Hills', name: 'Hill repeats', shape: 'timed_reps', cue: 'Hard uphill with tall posture, easy jog back down', defaults: { reps: 8, repSec: 60, restSec: 90 } },
  { id: 'fartlek', chip: 'Fartlek', name: 'Fartlek', shape: 'timed_reps', cue: 'Surge hard, then float easy — by feel, not by watch', defaults: { reps: 8, repSec: 60, restSec: 60 } },
];

export function runPreset(id: RunPresetId): RunPreset {
  return RUN_PRESETS.find((p) => p.id === id)!;
}

export function presetDetail(id: RunPresetId): RunDetail {
  return { preset: id, ...runPreset(id).defaults };
}

// Total distance run, in km.
export function runDistanceKm(r: RunDetail): number | undefined {
  if (runPreset(r.preset).shape === 'tempo') {
    const sum = (r.warmupKm ?? 0) + (r.tempoKm ?? 0) + (r.cooldownKm ?? 0);
    return sum > 0 ? round2(sum) : undefined;
  }
  return r.distanceKm;
}

export function paceSecPerKm(timeSec: number | undefined, km: number | undefined): number | undefined {
  if (!timeSec || !km) return undefined;
  return Math.round(timeSec / km);
}

export function formatPace(secPerKm: number): string {
  return `${Math.floor(secPerKm / 60)}:${String(secPerKm % 60).padStart(2, '0')} /km`;
}

export function formatKm(km: number): string {
  return `${round2(km)} km`;
}

// Rep times that were actually entered, with their pace.
export function repPaces(r: RunDetail): { index: number; timeSec: number; pace: number }[] {
  if (runPreset(r.preset).shape !== 'distance_reps' || !r.repM) return [];
  const km = r.repM / 1000;
  return (r.repTimesSec ?? [])
    .map((t, index) => (t ? { index, timeSec: t, pace: Math.round(t / km) } : null))
    .filter((x): x is { index: number; timeSec: number; pace: number } => x != null);
}

// The one pace that best represents the session: rep average for intervals,
// tempo-segment pace for tempo, overall pace otherwise.
export function keyPace(r: RunDetail, totalTimeSec?: number): number | undefined {
  const shape = runPreset(r.preset).shape;
  if (shape === 'distance_reps') {
    const reps = repPaces(r);
    if (reps.length) return Math.round(reps.reduce((s, x) => s + x.pace, 0) / reps.length);
  }
  if (shape === 'tempo') {
    const p = paceSecPerKm(r.tempoTimeSec, r.tempoKm);
    if (p) return p;
  }
  return paceSecPerKm(totalTimeSec, runDistanceKm(r));
}

// One-line structure, e.g. "6 × 800 m · 1:30 rest" or "1.5 + 4 + 1.5 km".
export function runStructure(r: RunDetail): string {
  const shape = runPreset(r.preset).shape;
  const rest = r.restSec ? ` · ${formatSec(r.restSec)} rest` : '';
  switch (shape) {
    case 'steady':
      return r.distanceKm ? formatKm(r.distanceKm) : '';
    case 'tempo':
      return `${round2(r.warmupKm ?? 0)} + ${round2(r.tempoKm ?? 0)} + ${round2(r.cooldownKm ?? 0)} km`;
    case 'distance_reps':
      return `${r.reps ?? 0} × ${r.repM ?? 0} m${rest}`;
    case 'timed_reps':
      return `${r.reps ?? 0} × ${formatSec(r.repSec ?? 0)}${rest}`;
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// "5 km · 26:00 · 5:12 /km" — distance, time, and the session's key pace.
export function runSummary(r: RunDetail, totalTimeSec?: number): string {
  const km = runDistanceKm(r);
  return [km ? formatKm(km) : null, timeAndPace(r, totalTimeSec)].filter(Boolean).join(' · ');
}

// "38:40 · reps 3:57 /km" — the pace is labelled when it isn't the overall pace.
export function timeAndPace(r: RunDetail, totalTimeSec?: number): string {
  const pace = keyPace(r, totalTimeSec);
  const overall = paceSecPerKm(totalTimeSec, runDistanceKm(r));
  const shape = runPreset(r.preset).shape;
  const prefix = pace === overall ? '' : shape === 'tempo' ? 'tempo ' : 'reps ';
  return [
    totalTimeSec != null ? formatSec(totalTimeSec) : null,
    pace ? `${prefix}${formatPace(pace)}` : null,
  ].filter(Boolean).join(' · ');
}
