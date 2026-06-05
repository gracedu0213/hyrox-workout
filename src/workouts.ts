// Helpers bridging the clean custom-workout model (blocks + single weight) to
// the library's flat { setup, exercises } shape so LogPage/formatExercise can be
// reused unchanged.

import { formatSec } from './format';
import type {
  Block,
  BlockRow,
  CustomWorkout,
  Exercise,
  ExSpec,
  RestSpec,
  SingleWeight,
  Weight,
  WorkoutFormat,
  WorkoutSetup,
  WorkoutSnapshot,
} from './types';

export const isRest = (r: BlockRow): r is RestSpec => r.kind === 'rest';
export const isExercise = (r: BlockRow): r is ExSpec => r.kind !== 'rest';

// Migrate persisted blocks from the pre-row shape ({ exercises, rest, restSec })
// to the current row model. New-shape blocks pass through untouched.
export function normalizeBlocks(blocks: unknown): Block[] {
  if (!Array.isArray(blocks)) return [];
  return blocks.map((b): Block => {
    if (Array.isArray(b.rows)) return b as Block;
    if (b.rest) return { repeat: 1, rows: [{ kind: 'rest', restSec: b.restSec ?? 60 }] };
    return {
      label: b.label,
      repeat: b.repeat ?? 1,
      rows: (b.exercises ?? []) as ExSpec[],
    };
  });
}

export function formatSingleWeight(w?: SingleWeight): string {
  if (!w) return '';
  return `${w.value} ${w.unit}`;
}

// Map the single personal weight onto a gendered Weight using only the men's
// field for the chosen unit. formatWeight() renders this as e.g. "24kg" when
// called WITHOUT a gender (which is how custom workouts must format it).
function specWeight(w?: SingleWeight): Weight | undefined {
  if (!w) return undefined;
  return w.unit === 'kg' ? { kgM: w.value } : { lbsM: w.value };
}

function specToExercise(s: ExSpec): Exercise {
  return { name: s.name, qty: s.qty, unit: s.unit, weight: specWeight(s.weight), note: s.note };
}

export function totalRounds(blocks: Block[]): number {
  // Only blocks that contain work count as rounds; a rest-only block doesn't.
  return blocks
    .filter((b) => b.rows.some(isExercise))
    .reduce((n, b) => n + Math.max(1, b.repeat || 1), 0);
}

function formatToSetup(format: WorkoutFormat, rounds: number): WorkoutSetup {
  switch (format.type) {
    case 'rounds':
      return { type: 'rounds', rounds };
    case 'for_time':
      // Multiple rounds → use rft so LogPage offers per-round splits.
      return rounds > 1 ? { type: 'rft', rounds } : { type: 'for_time' };
    case 'amrap':
      return { type: 'amrap', durationSec: format.durationSec };
    case 'emom':
      return { type: 'emom', everySec: format.everySec, totalRounds: format.totalRounds };
    case 'intervals':
      return {
        type: 'intervals',
        rounds: format.rounds,
        workSec: format.workSec,
        restSec: format.restSec,
      };
  }
}

// Flatten blocks into a single exercise list, inserting a "—" separator row
// between blocks (the library's divider convention).
export function customToSetup(w: CustomWorkout): { setup: WorkoutSetup; exercises: Exercise[] } {
  const setup = formatToSetup(w.format, totalRounds(w.blocks));
  const exercises: Exercise[] = [];
  const multiWork = w.blocks.filter((b) => b.rows.some(isExercise)).length > 1;
  let workIdx = 0;
  w.blocks.forEach((b) => {
    if (b.rows.some(isExercise)) {
      workIdx += 1;
      if (multiWork || b.label) {
        const label = b.label || `Block ${workIdx}`;
        const rep = b.repeat > 1 ? ` ×${b.repeat}` : '';
        exercises.push({ name: `— ${label}${rep} —` });
      }
    }
    b.rows.forEach((row) => {
      if (isRest(row)) {
        exercises.push({ name: `— Rest${row.restSec ? ` ${formatSec(row.restSec)}` : ''} —` });
      } else {
        exercises.push(specToExercise(row));
      }
    });
  });
  return { setup, exercises };
}

export function buildSnapshot(w: CustomWorkout): WorkoutSnapshot {
  const { setup, exercises } = customToSetup(w);
  return { name: w.name, setup, exercises, blocks: w.blocks, notes: w.notes };
}
