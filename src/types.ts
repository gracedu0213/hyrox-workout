// Plan schema (static) + log schema (IndexedDB)

export type Phase = 'BASE' | 'PACE' | 'ACCELERATE' | 'PRIME' | 'RACE';
export type Category = 'FOUNDATION' | 'AEROBIC' | 'ENGINE' | 'POWER' | 'COMPLETE';
export type DayOfWeek = 'mon' | 'tue' | 'wed' | 'thu' | 'fri';

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
  dayId?: string;                   // refs Day.id (omitted for custom/rest)
  customName?: string;              // for kind='custom', e.g. "Basketball", "Long run"
  kind?: 'plan' | 'custom' | 'rest'; // default 'plan' when dayId is present
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
