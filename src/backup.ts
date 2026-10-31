// Whole-database backup: export every table to one JSON file, and restore from
// it. Restore only ADDS records whose id isn't already on this device — it
// never overwrites or deletes — so it's safe to run on a device that has newer
// edits, and running it twice is a no-op.

import { db } from './db';

const TABLES = ['logs', 'workouts', 'plans', 'workoutTypes'] as const;
type TableName = (typeof TABLES)[number];

export interface Backup {
  app: 'hyrox-tracker';
  exportedAt: string; // ISO timestamp
  dbVersion: number;
  tables: Record<TableName, { id: string }[]>;
}

export type TableCounts = Record<TableName, number>;

export async function createBackup(): Promise<Backup> {
  const tables = {} as Backup['tables'];
  await db.transaction('r', TABLES.map((t) => db.table(t)), async () => {
    for (const t of TABLES) tables[t] = await db.table(t).toArray();
  });
  return { app: 'hyrox-tracker', exportedAt: new Date().toISOString(), dbVersion: db.verno, tables };
}

export function countRecords(b: Backup): TableCounts {
  return Object.fromEntries(TABLES.map((t) => [t, b.tables[t].length])) as TableCounts;
}

export function parseBackup(text: string): Backup {
  let b: Backup;
  try {
    b = JSON.parse(text);
  } catch {
    throw new Error('That file isn\'t valid JSON.');
  }
  if (b?.app !== 'hyrox-tracker' || !b.tables) throw new Error('That file isn\'t a HYROX Tracker backup.');
  for (const t of TABLES) {
    const rows = b.tables[t];
    if (!Array.isArray(rows) || rows.some((r) => typeof r?.id !== 'string')) {
      throw new Error(`Backup is damaged (table "${t}").`);
    }
  }
  if (b.dbVersion > db.verno) throw new Error('This backup is from a newer version of the app. Update the app first.');
  return b;
}

// Returns how many records were added per table.
export async function restoreBackup(b: Backup): Promise<TableCounts> {
  const added = {} as TableCounts;
  await db.transaction('rw', TABLES.map((t) => db.table(t)), async () => {
    for (const t of TABLES) {
      const table = db.table(t);
      const rows = b.tables[t];
      const existing = new Set(await table.bulkGet(rows.map((r) => r.id)).then((rs) => rs.flatMap((r) => (r ? [r.id] : []))));
      const fresh = rows.filter((r) => !existing.has(r.id));
      await table.bulkAdd(fresh);
      added[t] = fresh.length;
    }
  });
  return added;
}

// Hand the file to the OS share sheet where supported (iOS: Save to Files,
// AirDrop, Mail); otherwise trigger a normal download.
export async function saveBackupFile(b: Backup): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const name = `hyrox-backup-${b.exportedAt.slice(0, 10)}.json`;
  const file = new File([JSON.stringify(b)], name, { type: 'application/json' });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'HYROX Tracker backup' });
      return 'shared';
    } catch (e) {
      if ((e as Error).name === 'AbortError') return 'cancelled';
      // e.g. NotAllowedError when the share sheet is unavailable — download instead.
    }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return 'downloaded';
}
