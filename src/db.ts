import Dexie, { type Table } from 'dexie';
import type { WorkoutLog } from './types';

class HyroxDB extends Dexie {
  logs!: Table<WorkoutLog, string>;

  constructor() {
    super('hyrox-tracker');
    this.version(1).stores({
      logs: 'id, dayId, date, createdAt',
    });
    this.version(2).stores({
      logs: 'id, dayId, date, createdAt, kind',
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
