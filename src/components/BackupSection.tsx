import { useRef, useState } from 'react';
import { countRecords, createBackup, parseBackup, restoreBackup, saveBackupFile, type TableCounts } from '../backup';

function describe(c: TableCounts): string {
  return `${c.logs} logs · ${c.workouts} workouts · ${c.plans} plans · ${c.workoutTypes} types`;
}

// Export / restore controls for the profile dialog. Everything lives only in
// this browser, so this is the user's one way to keep a copy.
export default function BackupSection() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<{ text: string; error?: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  async function onExport() {
    setBusy(true);
    setStatus(null);
    try {
      const b = await createBackup();
      const result = await saveBackupFile(b);
      if (result !== 'cancelled') setStatus({ text: `Backed up ${describe(countRecords(b))}.` });
    } catch (e) {
      setStatus({ text: `Export failed: ${(e as Error).message}`, error: true });
    } finally {
      setBusy(false);
    }
  }

  async function onFile(file: File) {
    setBusy(true);
    setStatus(null);
    try {
      const b = parseBackup(await file.text());
      const added = await restoreBackup(b);
      const total = Object.values(added).reduce((a, n) => a + n, 0);
      setStatus({
        text: total === 0
          ? 'Nothing new to restore — everything in that backup is already here.'
          : `Restored ${describe(added)}. Reloading…`,
      });
      if (total > 0) setTimeout(() => window.location.reload(), 1200);
    } catch (e) {
      setStatus({ text: (e as Error).message, error: true });
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  return (
    <div className="mt-5 pt-4 border-t border-line">
      <span className="text-xs uppercase tracking-widest text-muted">Your data</span>
      <p className="text-[11px] text-muted mt-1">
        Your workouts are stored only on this device. Export a backup file to keep a copy.
        Restoring only adds what's missing — it never overwrites or deletes.
      </p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onExport}
          disabled={busy}
          className="py-2.5 rounded bg-panel2 text-xs font-semibold uppercase tracking-wider text-accent disabled:opacity-40"
        >
          Export backup
        </button>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          className="py-2.5 rounded bg-panel2 text-xs font-semibold uppercase tracking-wider text-white/80 disabled:opacity-40"
        >
          Restore
        </button>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }}
      />
      {status && (
        <p className={`text-[11px] mt-2 ${status.error ? 'text-red-400' : 'text-accent'}`}>{status.text}</p>
      )}
    </div>
  );
}
