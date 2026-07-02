import Dexie, { type Table } from 'dexie';
import type { CustomWorkout, UserPlan, WorkoutLog, WorkoutType } from './types';
import { normalizeBlocks } from './workouts';

// Bring persisted workouts up to the current block-row shape on read, so every
// consumer downstream sees one model regardless of when the row was written.
function migrateWorkout(w: CustomWorkout): CustomWorkout {
  return { ...w, blocks: normalizeBlocks(w.blocks) };
}

// The curated 12-week program is a "virtual" plan: it has no DB row until the
// user commits to it (Start), at which point a row with this id is materialized.
export const CURATED_PLAN_ID = 'curated-12-week';

// Seeded once (fresh install via populate, existing DBs via the v5 upgrade).
// Fixed ids + epoch-adjacent createdAt keep defaults stable and sorted first.
const DEFAULT_WORKOUT_TYPES: WorkoutType[] = [
  { id: 'type-running', name: 'Running', color: '#5BC0EB', createdAt: 0 },
  { id: 'type-functional', name: 'Functional', color: '#FF6B6B', createdAt: 1 },
  { id: 'type-deadhang', name: 'Deadhang', color: '#9B59B6', createdAt: 2 },
];

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

export async function getWorkoutTypes(): Promise<WorkoutType[]> {
  return db.workoutTypes.orderBy('createdAt').toArray();
}

export async function saveWorkoutType(t: WorkoutType): Promise<void> {
  await db.workoutTypes.put(t);
}

// --- Plans ---

export async function getPlans(): Promise<UserPlan[]> {
  const all = await db.plans.orderBy('createdAt').reverse().toArray();
  return all.filter((p) => !p.archived);
}

export async function getActivePlans(): Promise<UserPlan[]> {
  const all = await db.plans.toArray();
  return all.filter((p) => p.active && !p.archived);
}

export async function getPlan(id: string): Promise<UserPlan | undefined> {
  return db.plans.get(id);
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
