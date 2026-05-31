import type { Exercise, TargetUnit, Weight, WorkoutSetup } from './types';
import type { Gender } from './profile';

export interface FormatOpts {
  gender?: Gender;
}

export function formatWeight(w?: Weight, opts: FormatOpts = {}): string {
  if (!w) return '';
  const parts: string[] = [];
  if (opts.gender === 'M') {
    if (w.lbsM != null) parts.push(`${w.lbsM}lbs`);
    if (w.kgM != null) parts.push(`${w.kgM}kg`);
  } else if (opts.gender === 'F') {
    if (w.lbsF != null) parts.push(`${w.lbsF}lbs`);
    if (w.kgF != null) parts.push(`${w.kgF}kg`);
  } else {
    if (w.lbsM != null && w.lbsF != null) parts.push(`${w.lbsM}/${w.lbsF}lbs`);
    else if (w.lbsM != null) parts.push(`${w.lbsM}lbs`);
    if (w.kgM != null && w.kgF != null) parts.push(`${w.kgM}/${w.kgF}kg`);
    else if (w.kgM != null) parts.push(`${w.kgM}kg`);
  }
  let out = parts.join(' / ');
  if (w.count && w.count > 1) out += ` × ${w.count}`;
  if (w.note) out += ` (${w.note})`;
  return out;
}

function unitSuffix(u: TargetUnit | undefined, valueStr: string, plural = true): string {
  if (u === 'reps') return `${valueStr} reps`;
  if (u === 'meters') return `${valueStr}m`;
  if (u === 'feet') return `${valueStr}ft`;
  if (u === 'calories') return `${valueStr} cal`;
  if (u === 'seconds') return `${valueStr} sec`;
  if (u === 'minutes') return `${valueStr} min`;
  if (u === 'miles') return `${valueStr} mile${plural ? 's' : ''}`;
  return valueStr;
}

export function formatQty(ex: Exercise): string {
  const u = ex.unit;
  if (ex.perRound && ex.perRound.length) return ex.perRound.join('-');
  if (ex.ladder) {
    const { start, step, openEnded } = ex.ladder;
    const seq = [0, 1, 2, 3, 4].map((i) => start + i * step).join('-');
    return unitSuffix(u, openEnded ? `${seq}-etc` : seq);
  }
  if (ex.qtyMin != null && ex.qtyMax != null) {
    return unitSuffix(u, `${ex.qtyMin}-${ex.qtyMax}`);
  }
  if (u === 'failure') return 'to Failure';
  if (u === 'max') return 'Max';
  if (ex.qty == null) return '';
  return unitSuffix(u, String(ex.qty), ex.qty !== 1);
}

export function formatExercise(ex: Exercise, opts: FormatOpts = {}): string {
  const isSeparator = ex.name.startsWith('—');
  if (isSeparator) return ex.name;
  const qty = formatQty(ex);
  const head = qty ? `${qty} ${ex.name}` : ex.name;
  const bits: string[] = [head];
  if (ex.modifier) bits.push(`(${ex.modifier})`);
  if (ex.weight) bits.push(`(${formatWeight(ex.weight, opts)})`);
  if (ex.note) bits.push(`— ${ex.note}`);
  return bits.join(' ');
}

export function setupSummary(s: WorkoutSetup): string {
  switch (s.type) {
    case 'for_time': return 'For Time';
    case 'rft': return `${s.rounds} Rounds for Time`;
    case 'descending_rounds': return `${s.rounds} Rounds (descending reps)`;
    case 'amrap': return `${Math.round(s.durationSec / 60)} Min AMRAP`;
    case 'multi_window_amrap': return `${s.windows.length}-Window AMRAP`;
    case 'emom': return `Every ${formatSec(s.everySec)} × ${s.totalRounds}`;
    case 'intervals': {
      const work = s.workSec ? formatSec(s.workSec) : s.workDescription;
      const rest = s.restSec ? `${formatSec(s.restSec)} rest` : '';
      return `${s.rounds} × ${work}${rest ? ` / ${rest}` : ''}`;
    }
    case 'for_quality': return 'For Quality';
    case 'ladder': return `Ladder ${s.sequence.join('-')}${s.openEnded ? '-etc' : ''}`;
    case 'rounds': return `${s.rounds} Rounds`;
  }
}

export function formatSec(sec: number): string {
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s === 0 ? `${m}:00` : `${m}:${String(s).padStart(2, '0')}`;
}
