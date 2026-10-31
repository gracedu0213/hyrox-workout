import Dexie, { type Table } from 'dexie';
import type { CustomWorkout, UserPlan, WorkoutLog, WorkoutType } from './types';
import { normalizeBlocks } from './workouts';
import { curatedProgram } from './plan';
import { BUILTIN_TYPES } from './tags';

// Bring persisted workouts up to the current block-row shape on read, so every
// consumer downstream sees one model regardless of when the row was written.
function migrateWorkout(w: CustomWorkout): CustomWorkout {
  return { ...w, blocks: normalizeBlocks(w.blocks) };
}

// Seeded once (fresh install via populate, existing DBs via the v5 upgrade).
// Fixed ids + epoch-adjacent createdAt keep defaults stable and sorted first.
const DEFAULT_WORKOUT_TYPES: WorkoutType[] = [
  { id: 'type-running', name: 'Running', color: '#FF9F43', createdAt: 0 },
  { id: 'type-functional', name: 'Functional', color: '#FF6BB5', createdAt: 1 },
  { id: 'type-deadhang', name: 'Deadhang', color: '#4ADEDE', createdAt: 2 },
];

// The defaults' original colors, which collided with the built-in HYROX types.
const LEGACY_DEFAULT_COLORS: Record<string, string> = {
  'type-running': '#5BC0EB',
  'type-functional': '#FF6B6B',
  'type-deadhang': '#9B59B6',
};

class HyroxDB extends Dexie {
  logs!: Table<WorkoutLog, string>;
  workouts!: Table<CustomWorkout, string>;
  plans!: Table<UserPlan, string>;
  workoutTypes!: Table<WorkoutType, string>;

  constructor() {
    super('hyrox-tracker');
    this.version(1).stores({
      logs: 'id, dayId, date, createdAt',
    });
    this.version(2).stores({
      logs: 'id, dayId, date, createdAt, kind',
    });
    this.version(3).stores({
      logs: 'id, dayId, workoutId, date, createdAt, kind',
      workouts: 'id, source, createdAt, archived',
    });
    this.version(4).stores({
      logs: 'id, dayId, workoutId, planId, date, createdAt, kind',
      plans: 'id, active, archived, createdAt',
    });
    this.version(5)
      .stores({
        workoutTypes: 'id, createdAt',
      })
      .upgrade((tx) => tx.table('workoutTypes').bulkAdd(DEFAULT_WORKOUT_TYPES));
    // Recolor the seeded defaults off the built-in HYROX colors — only where the
    // user hasn't already picked their own color.
    this.version(6).stores({}).upgrade(async (tx) => {
      for (const d of DEFAULT_WORKOUT_TYPES) {
        await tx.table('workoutTypes')
          .where('id').equals(d.id)
          .modify((t: WorkoutType) => { if (t.color === LEGACY_DEFAULT_COLORS[d.id]) t.color = d.color; });
      }
    });
    // populate fires only on fresh DB creation (upgrade callbacks don't).
    this.on('populate', () => {
      this.workoutTypes.bulkAdd(DEFAULT_WORKOUT_TYPES);
    });
  }
}

export const db = new HyroxDB();

export function newId(): string {
  // iOS Safari only exposes crypto.randomUUID on secure (HTTPS) contexts.
  // Fall back to a v4-shaped UUID built from Math.random for HTTP/LAN dev.
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export async function getLog(id: string): Promise<WorkoutLog | undefined> {
  return db.logs.get(id);
}

export async function getLogsForDate(date: string): Promise<WorkoutLog[]> {
  return db.logs.where('date').equals(date).toArray();
}

export async function getLogsForDay(dayId: string): Promise<WorkoutLog[]> {
  return db.logs.where('dayId').equals(dayId).reverse().sortBy('createdAt');
}

export async function getAllLogs(): Promise<WorkoutLog[]> {
  return db.logs.orderBy('createdAt').reverse().toArray();
}

export async function saveLog(log: WorkoutLog): Promise<void> {
  await db.logs.put(log);
}

export async function deleteLog(id: string): Promise<void> {
  await db.logs.delete(id);
}

// --- Custom workouts ---

export async function getWorkout(id: string): Promise<CustomWorkout | undefined> {
  const w = await db.workouts.get(id);
  return w ? migrateWorkout(w) : undefined;
}

export async function getCustomWorkouts(): Promise<CustomWorkout[]> {
  const all = await db.workouts.orderBy('createdAt').reverse().toArray();
  return all.filter((w) => !w.archived).map(migrateWorkout);
}

export async function saveWorkout(w: CustomWorkout): Promise<void> {
  await db.workouts.put(w);
}

export async function deleteWorkout(id: string): Promise<void> {
  await db.workouts.delete(id);
}

// --- Workout types ---

// Built-in HYROX types first, then the user's own (stored) types.
export async function getWorkoutTypes(): Promise<WorkoutType[]> {
  return [...BUILTIN_TYPES, ...(await db.workoutTypes.orderBy('createdAt').toArray())];
}

export async function saveWorkoutType(t: WorkoutType): Promise<void> {
  await db.workoutTypes.put(t);
}

// --- Plans ---

// A curated program's identity (name/color/icon) comes from the registry, not
// the stored row, so plans committed before a rename show the current name.
function readPlan(p: UserPlan): UserPlan {
  const c = curatedProgram(p.id);
  return c ? { ...p, name: c.name, color: c.color, icon: c.icon } : p;
}

export async function getPlans(): Promise<UserPlan[]> {
  const all = await db.plans.orderBy('createdAt').reverse().toArray();
  return all.filter((p) => !p.archived).map(readPlan);
}

export async function getActivePlans(): Promise<UserPlan[]> {
  const all = await db.plans.toArray();
  return all.filter((p) => p.active && !p.archived).map(readPlan);
}

export async function getPlan(id: string): Promise<UserPlan | undefined> {
  const p = await db.plans.get(id);
  return p && readPlan(p);
}

// Create, update, start, and end all collapse into one put (toggle `active`).
export async function savePlan(p: UserPlan): Promise<void> {
  await db.plans.put(p);
}

export async function archivePlan(id: string): Promise<void> {
  await db.plans.update(id, { archived: true, active: false });
}

export async function getLogsForPlan(id: string): Promise<WorkoutLog[]> {
  return db.logs.where('planId').equals(id).toArray();
}

export async function setLogPlanId(logId: string, planId: string): Promise<void> {
  await db.logs.update(logId, { planId });
}
