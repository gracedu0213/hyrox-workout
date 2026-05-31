import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { getLog, newId, saveLog } from '../db';
import type { WorkoutLog } from '../types';
import TimeInput from '../components/TimeInput';
import FeltPicker, { type Felt } from '../components/FeltPicker';

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function CustomLogPage() {
  const [searchParams] = useSearchParams();
  const editingId = searchParams.get('id') ?? undefined;
  const presetDate = searchParams.get('date') ?? todayISO();
  const nav = useNavigate();

  const [logId, setLogId] = useState<string>(() => editingId ?? newId());
  const [createdAt, setCreatedAt] = useState<number>(() => Date.now());
  const [date, setDate] = useState(presetDate);
  const [customName, setCustomName] = useState('');
  const [totalTimeSec, setTotalTimeSec] = useState<number | undefined>();
  const [felt, setFelt] = useState<Felt | undefined>();
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!editingId) return;
    getLog(editingId).then((l) => {
      if (!l) return;
      setLogId(l.id);
      setCreatedAt(l.createdAt);
      setDate(l.date);
      setCustomName(l.customName ?? '');
      setTotalTimeSec(l.totalTimeSec);
      setFelt(l.feltLike);
      setNotes(l.notes ?? '');
    });
  }, [editingId]);

  async function save() {
    const log: WorkoutLog = {
      id: logId,
      kind: 'custom',
      customName: customName || 'Custom workout',
      date,
      createdAt,
      status: 'logged',
      totalTimeSec,
      feltLike: felt,
      notes: notes || undefined,
    };
    await saveLog(log);
    nav(`/log/${log.id}?celebrate=1`);
  }

  return (
    <div className="pb-32">
      <div className="px-4 pt-3 pb-3 border-b border-line">
        <Link to="/" className="text-muted text-xs">← Back</Link>
        <div className="mt-2 font-display text-xl">
          {editingId ? 'Edit custom workout' : 'Custom workout'}
        </div>
        <div className="mt-1 text-sm text-muted">Anything outside the plan: basketball, long run, swim, yoga, etc.</div>
      </div>

      <section className="px-4 pt-4 space-y-4">
        <div>
          <label className="text-xs uppercase tracking-widest text-muted">What did you do?</label>
          <input
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            className="block mt-1 bg-panel rounded px-3 py-2 w-full"
            placeholder="e.g. Basketball, Long run, Swim"
          />
        </div>

        <div>
          <label className="text-xs uppercase tracking-widest text-muted">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="block mt-1 bg-panel rounded px-3 py-2 w-full"
          />
        </div>

        <div>
          <label className="text-xs uppercase tracking-widest text-muted">Total time</label>
          <div className="mt-1">
            <TimeInput valueSec={totalTimeSec} onChange={setTotalTimeSec} placeholder />
          </div>
        </div>

        <FeltPicker value={felt} onChange={setFelt} />

        <div>
          <label className="text-xs uppercase tracking-widest text-muted">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="mt-1 w-full bg-panel rounded px-3 py-2 text-sm"
            placeholder="How did it go?"
          />
        </div>
      </section>

      <div className="fixed bottom-[calc(env(safe-area-inset-bottom)+56px)] left-0 right-0 bg-bg border-t border-line p-3">
        <button
          onClick={save}
          className="w-full bg-accent text-bg rounded-lg py-3 font-semibold uppercase tracking-wider"
        >
          Save
        </button>
      </div>
    </div>
  );
}
