// Plan schema (static) + log schema (IndexedDB)

export type Phase = 'BASE' | 'PACE' | 'ACCELERATE' | 'PRIME' | 'RACE';
export type Category = 'FOUNDATION' | 'AEROBIC' | 'ENGINE' | 'POWER' | 'COMPLETE';
// The curated 12-week plan only uses mon–fri; user-built plans use the full week.
export type DayOfWeek = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

// --- Workout setup variants ---

export interface SetupForTime {
  type: 'for_time';
}

export interface SetupRFT {
  type: 'rft';
  rounds: number;
  // If reps vary per round, list the multiplier sequence (e.g. [3,3,3] would just be 3x).
  // For "descending reps each round" use SetupDescendingRounds instead.
}

export interface SetupDescendingRounds {
  type: 'descending_rounds';
  rounds: number;
  // Each round detail in plain text (e.g. "Round 1: 800m + 30 reps").
  // Reps inside exercises are described per round in `roundDetails`.
  roundDetails?: string[];
}

export interface SetupAMRAP {
  type: 'amrap';
  durationSec: number;
}

export interface MultiWindow {
  label: string; // e.g. "0:00 - 12:00"
  durationSec: number;
  // The exercises list at the Day level is partitioned per window when needed.
  exerciseRefs?: number[]; // indices into Day.exercises
}

export interface SetupMultiWindowAMRAP {
  type: 'multi_window_amrap';
  windows: MultiWindow[];
}

export interface SetupEMOM {
  type: 'emom';
  everySec: number;
  totalRounds: number;
  // For E2MOM or "Every 3:30 x 5" etc. Each minute does the listed exercises.
}

export interface SetupIntervals {
  type: 'intervals';
  rounds: number;
  workSec?: number;     // null = "for distance/cal", just rest is timed
  restSec?: number;
  // Use when work is distance-based (e.g. "8 x 400m run, 2:00 rest after each")
  workDescription?: string;
}

export interface SetupForQuality {
  type: 'for_quality';
}

export interface SetupLadder {
  type: 'ladder';
  // The rep sequence applies across each exercise in order. e.g. [5,10,15,20,25,...]
  sequence: number[];
  ascending: boolean;
  openEnded?: boolean; // "5-10-15-20-25-etc"
}

export interface SetupRounds {
  // Simple "N rounds" with no timing (rare; mostly Hyrox Power "for quality").
  type: 'rounds';
  rounds: number;
}

export type WorkoutSetup =
  | SetupForTime
  | SetupRFT
  | SetupDescendingRounds
  | SetupAMRAP
  | SetupMultiWindowAMRAP
  | SetupEMOM
  | SetupIntervals
  | SetupForQuality
  | SetupLadder
  | SetupRounds;

// --- Exercise ---

export type TargetUnit = 'reps' | 'meters' | 'feet' | 'calories' | 'seconds' | 'minutes' | 'miles' | 'failure' | 'max';

export interface Weight {
  lbsM?: number; // men's lbs
  kgM?: number;  // men's kg
  lbsF?: number; // women's lbs
  kgF?: number;  // women's kg
  count?: number; // e.g. "x 2" for pair
  note?: string;  // free text like "AHAP", "1/2 normal", "Unbroken"
}

export interface Exercise {
  name: string;
  // Primary target:
  qty?: number;
  unit?: TargetUnit;
  // Alt forms:
  perRound?: number[]; // when reps change per round (descending_rounds)
  // Open-ended ladder where reps grow each round (e.g. 5-10-15-20-25-etc).
  ladder?: { start: number; step: number; openEnded?: boolean };
  // Range (e.g. "45-60 min", "10-20 reps").
  qtyMin?: number;
  qtyMax?: number;
  weight?: Weight;
  // Modifier text (Unbroken, AHAP, "Max", "x Failure", "Each Leg", etc.)
  modifier?: string;
  // Free notes attached specifically to this exercise (e.g. "Unbroken").
  note?: string;
}

// --- Day & Plan ---

export interface Day {
  id: string;           // "w01-mon"
  week: number;         // 1-12
  phase: Phase;
  dayOfWeek: DayOfWeek;
  category: Category;
  setup: WorkoutSetup;
  workoutLabel: string; // raw label from PDF, e.g. "4 RFT:" or "25 Min AMRAP:"
  exercises: Exercise[];
  notes: string[];
}

export interface Plan {
  days: Day[];
}

// --- Custom workouts (user-authored, IndexedDB) ---

// A reusable label for workouts (e.g. Running, Functional). Defaults are seeded
// in the DB; users can create more, each with its own label color.
export interface WorkoutType {
  id: string;    // uuid; seeded defaults use fixed ids
  name: string;
  color: string; // hex; rendered via inline styles (not bg-${x})
  createdAt: number;
}

export type Intensity = 'easy' | 'moderate' | 'hard';
export type WeightUnit = 'kg' | 'lb';
export interface SingleWeight {
  value: number;
  unit: WeightUnit;
}

// One exercise inside a custom workout block. Simpler than the library `Exercise`:
// a single personal weight instead of the gendered M/F × lb/kg matrix.
export interface ExSpec {
  kind?: 'exercise'; // discriminator; absent = exercise (see BlockRow)
  name: string;
  qty?: number;
  unit?: TargetUnit;
  weight?: SingleWeight;
  note?: string;
}

// A timed rest, modeled as a row inside a block so it repeats with the round
// (e.g. "800m run → rest 2:00" ×6). A rest in its own repeat-1 block is the
// "rest once between work blocks" case.
export interface RestSpec {
  kind: 'rest';
  restSec: number;
}

// A block's contents are an ordered list of work and rest rows.
export type BlockRow = ExSpec | RestSpec;

// A block is a repeated group of rows (one "round set"). Multiple blocks let a
// workout mix repeated rounds with different-per-round content. Rest rows are
// time-only and never counted as rounds when logging.
export interface Block {
  label?: string;
  repeat: number; // rounds for THIS block (default 1)
  rows: BlockRow[];
}

// Format governs timing + which result sections appear when logging.
export type WorkoutFormat =
  | { type: 'rounds' } // just do the blocks (untimed / for quality)
  | { type: 'for_time' }
  | { type: 'amrap'; durationSec: number }
  | { type: 'emom'; everySec: number; totalRounds: number }
  | { type: 'intervals'; rounds: number; workSec?: number; restSec?: number };

export interface CustomWorkout {
  id: string; // uuid
  source: 'custom';
  name: string;
  format: WorkoutFormat;
  blocks: Block[];
  typeId?: string; // refs WorkoutType.id
  intensity?: Intensity;
  notes: string[];
  createdAt: number;
  archived?: boolean;
}

// --- Plans (committable programs, IndexedDB) ---

// One item in a user-built week. `dayOfWeek` is OPTIONAL: pin it to a weekday
// for day-by-day plans, or leave it off for "do this anytime this week" plans.
export type PlanSlot =
  | { kind: 'workout'; workoutId: string; dayOfWeek?: DayOfWeek } // refs CustomWorkout.id
  | { kind: 'rest'; dayOfWeek?: DayOfWeek };

// A user-built week is an ordered list of slots. Slots with a `dayOfWeek` form
// a day-of-week grid; slots without one are unscheduled ("any day this week").
export interface PlanWeek {
  slots: PlanSlot[];
}

// Curated reference (content lives in src/plan.ts PLAN), user-built weeks, or a
// flat "go-to" pool for cadence plans (no weeks, no days — just a menu).
export type PlanContent =
  | { type: 'curated' }
  | { type: 'sequenced'; weeks: PlanWeek[] }
  | { type: 'pool'; slots: PlanSlot[] };

// A Plan is "a thing you commit to": optional structured content AND/OR a
// per-week cadence goal, always tracking active state + progress.
export interface UserPlan {
  id: string;                 // uuid; curated programs use their fixed registry planId (plan.ts)
  name: string;
  color: string;              // hex; rendered via inline styles (not bg-${x})
  icon?: string;              // optional emoji
  content?: PlanContent;      // omitted => goal-only plan (e.g. "Run 5×/week")
  goalPerWeek?: number;       // weekly cadence target
  durationWeeks?: number;     // cadence plans: how long the block runs (omitted => ongoing)
  startDate?: string;         // ISO; if set, weeks pin to real dates (rare)
  active: boolean;
  createdAt: number;
  archived?: boolean;
}

// Self-contained copy of a custom workout, stored on the log so it renders and
// edits independently of the (possibly later-changed or deleted) template.
export interface WorkoutSnapshot {
  name: string;
  setup: WorkoutSetup; // derived from format, for LogPage reuse
  exercises: Exercise[]; // flattened from blocks, for LogPage reuse
  blocks: Block[]; // original structure for nice display
  notes: string[];
}

// --- Logs (IndexedDB) ---

export interface RoundSplit {
  roundIndex: number;
  splitSec?: number;     // cumulative or per-round (we'll define one convention in UI)
  notes?: string;
}

export interface ExerciseLogEntry {
  exerciseName: string;
  weightUsed?: string;   // free text, e.g. "24kg x 2"
  repsCompleted?: number;
  result?: string;       // free text fallback (e.g. "max effort", "broken at 12")
}

export interface AMRAPResult {
  fullRounds?: number;
  partialReps?: number;
  // For cal-based AMRAPs:
  totalCalories?: number;
  // For multi-window, results per window:
  perWindow?: { label: string; fullRounds?: number; partialReps?: number; totalCalories?: number; note?: string }[];
}

export interface IntervalResult {
  // e.g. per-round splits for "5 x 400m run"
  splits: { roundIndex: number; valueSec?: number; cal?: number; reps?: number; note?: string }[];
}

export interface WorkoutLog {
  id: string;                       // uuid
  dayId?: string;                   // refs Day.id (library workouts)
  workoutId?: string;               // refs CustomWorkout.id (custom workouts)
  customName?: string;              // for kind='custom', e.g. "Basketball", "Long run"
  kind?: 'plan' | 'custom' | 'rest'; // default 'plan' when dayId is present
  typeId?: string;                  // refs WorkoutType.id — set on quick custom logs (template logs resolve via workoutId)
  intensity?: Intensity;            // per-session effort tag
  planId?: string;                  // attributes this session to a committed UserPlan
  workoutSnapshot?: WorkoutSnapshot; // self-contained copy for custom workouts
  date: string;                     // ISO yyyy-mm-dd (date of training)
  createdAt: number;                // epoch ms
  // Optional structured results based on setup:
  totalTimeSec?: number;
  roundSplits?: RoundSplit[];
  amrap?: AMRAPResult;
  intervals?: IntervalResult;
  exercises?: ExerciseLogEntry[];
  // Always:
  feltLike?: 'tough' | 'ok' | 'good';  // emoji effort
  notes?: string;
  modifications?: string;           // what you swapped/changed
  // Lifecycle: a log can be "planned" (selected as today's workout, no results yet)
  // or "logged" (results have been entered).
  status?: 'planned' | 'logged';
}
