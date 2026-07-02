import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { getWorkout, newId, saveWorkout } from '../db';
import { setupSummary } from '../format';
import { customToSetup, isExercise, isRest } from '../workouts';
import TimeInput from '../components/TimeInput';
import TypePicker from '../components/TypePicker';
import type {
  Block,
  CustomWorkout,
  ExSpec,
  Intensity,
  RestSpec,
  TargetUnit,
  WeightUnit,
  WorkoutFormat,
} from '../types';

type FormatType = WorkoutFormat['type'];

const FORMATS: { type: FormatType; label: string }[] = [
  { type: 'rounds', label: 'Rounds' },
  { type: 'for_time', label: 'For Time' },
  { type: 'amrap', label: 'AMRAP' },
  { type: 'emom', label: 'EMOM' },
  { type: 'intervals', label: 'Intervals' },
];

const UNITS: TargetUnit[] = [
  'reps', 'meters', 'feet', 'calories', 'seconds', 'minutes', 'miles', 'failure', 'max',
];

const INTENSITIES: { value: Intensity; label: string }[] = [
  { value: 'easy', label: 'Easy' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'hard', label: 'Hard' },
];

function emptyExercise(): ExSpec {
  return { name: '', qty: undefined, unit: 'reps' };
}
function emptyRest(): RestSpec {
  return { kind: 'rest', restSec: 60 };
}
function emptyBlock(): Block {
  return { repeat: 1, rows: [emptyExercise()] };
}
function emptyRestBlock(): Block {
  return { repeat: 1, rows: [emptyRest()] };
}

export default function WorkoutBuilderPage() {
  const { id: editingId } = useParams<{ id: string }>();
  const nav = useNavigate();
  // When launched from another builder (e.g. adding a workout to a plan), return
  // there after saving instead of dumping the user in the workout library.
  const [params] = useSearchParams();
  const returnTo = params.get('returnTo');
  const exitTo = returnTo || '/workout/library';

  const [loaded, setLoaded] = useState(!editingId);
  const [workoutId] = useState<string>(() => editingId ?? newId());
  const [createdAt, setCreatedAt] = useState<number>(() => Date.now());
  const [name, setName] = useState('');
  const [formatType, setFormatType] = useState<FormatType>('rounds');
  const [amrapSec, setAmrapSec] = useState<number | undefined>(20 * 60);
  const [emomEverySec, setEmomEverySec] = useState<number | undefined>(60);
  const [emomTotal, setEmomTotal] = useState<number | undefined>(10);
  const [intervalRounds, setIntervalRounds] = useState<number | undefined>(5);
  const [intervalWorkSec, setIntervalWorkSec] = useState<number | undefined>();
  const [intervalRestSec, setIntervalRestSec] = useState<number | undefined>();
  const [blocks, setBlocks] = useState<Block[]>([emptyBlock()]);
  const [intensity, setIntensity] = useState<Intensity | undefined>();
  const [notes, setNotes] = useState('');
  const [typeId, setTypeId] = useState<string | undefined>();

  // Load existing workout when editing
  useEffect(() => {
    if (!editingId) return;
    getWorkout(editingId).then((w) => {
      if (!w) { setLoaded(true); return; }
      setCreatedAt(w.createdAt);
      setName(w.name);
      setFormatType(w.format.type);
      if (w.format.type === 'amrap') setAmrapSec(w.format.durationSec);
      if (w.format.type === 'emom') { setEmomEverySec(w.format.everySec); setEmomTotal(w.format.totalRounds); }
      if (w.format.type === 'intervals') {
        setIntervalRounds(w.format.rounds);
        setIntervalWorkSec(w.format.workSec);
        setIntervalRestSec(w.format.restSec);
      }
      setBlocks(w.blocks.length ? w.blocks : [emptyBlock()]);
      setTypeId(w.typeId);
      setIntensity(w.intensity);
      setNotes(w.notes.join('\n'));
      setLoaded(true);
    });
  }, [editingId]);

  function buildFormat(): WorkoutFormat {
    switch (formatType) {
      case 'amrap': return { type: 'amrap', durationSec: amrapSec ?? 0 };
      case 'emom': return { type: 'emom', everySec: emomEverySec ?? 60, totalRounds: emomTotal ?? 1 };
      case 'intervals': return { type: 'intervals', rounds: intervalRounds ?? 1, workSec: intervalWorkSec, restSec: intervalRestSec };
      case 'for_time': return { type: 'for_time' };
      default: return { type: 'rounds' };
    }
  }

  // Strip empty rows/weights/blocks for the live preview + on save.
  function cleanBlocks(): Block[] {
    return blocks
      .map((b) => ({
        ...b,
        rows: b.rows
          .filter((r) => (isRest(r) ? r.restSec > 0 : r.name.trim()))
          .map((r) => (isRest(r) ? r : { ...r, weight: r.weight && r.weight.value > 0 ? r.weight : undefined })),
      }))
      .filter((b) => b.rows.length > 0);
  }

  const canSave = name.trim().length > 0 && cleanBlocks().some((b) => b.rows.some(isExercise));

  async function save() {
    if (!canSave) return;
    const workout: CustomWorkout = {
      id: workoutId,
      source: 'custom',
      name: name.trim(),
      format: buildFormat(),
      blocks: cleanBlocks().map((b) => ({
        ...b,
        repeat: Math.max(1, b.repeat || 1),
        label: b.label?.trim() || undefined,
      })),
      typeId,
      intensity,
      notes: notes.split('\n').map((n) => n.trim()).filter(Boolean),
      createdAt,
    };
    await saveWorkout(workout);
    nav(exitTo);
  }

  // --- block / row mutators ---
  function updateBlock(bi: number, patch: Partial<Block>) {
    setBlocks((prev) => prev.map((b, i) => (i === bi ? { ...b, ...patch } : b)));
  }
  function updateRow(bi: number, ri: number, patch: Partial<ExSpec> & Partial<RestSpec>) {
    setBlocks((prev) =>
      prev.map((b, i) =>
        i === bi
          ? { ...b, rows: b.rows.map((r, j) => (j === ri ? ({ ...r, ...patch } as Block['rows'][number]) : r)) }
          : b,
      ),
    );
  }
  function addRow(bi: number, row: ExSpec | RestSpec) {
    setBlocks((prev) => prev.map((b, i) => (i === bi ? { ...b, rows: [...b.rows, row] } : b)));
  }
  function removeRow(bi: number, ri: number) {
    setBlocks((prev) =>
      prev.map((b, i) => (i === bi ? { ...b, rows: b.rows.filter((_, j) => j !== ri) } : b)),
    );
  }
  function addBlock() {
    setBlocks((prev) => [...prev, emptyBlock()]);
  }
  function addRestBlock() {
    setBlocks((prev) => [...prev, emptyRestBlock()]);
  }
  function removeBlock(bi: number) {
    setBlocks((prev) => prev.filter((_, i) => i !== bi));
  }

  if (!loaded) {
    return <div className="p-4 text-muted text-sm">Loading…</div>;
  }

  const preview = setupSummary(customToSetup({
    id: workoutId, source: 'custom', name, format: buildFormat(),
    blocks: cleanBlocks().length ? cleanBlocks() : blocks, intensity, notes: [], createdAt,
  }).setup);
  const multiWork = blocks.filter((b) => b.rows.some(isExercise)).length > 1;
  const canRemoveBlock = blocks.length > 1;

  return (
    <div className="pb-32">
      <div className="px-4 pt-3 pb-3 border-b border-line">
        <Link to={exitTo} className="text-muted text-xs">{returnTo ? '← Back' : '← Workouts'}</Link>
        <div className="mt-2 font-display text-xl">{editingId ? 'Edit workout' : 'New workout'}</div>
        <div className="mt-1 text-sm text-muted">{preview}</div>
      </div>

      <section className="px-4 pt-4 space-y-4">
        <div>
          <label className="text-xs uppercase tracking-widest text-muted">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="block mt-1 bg-panel rounded px-3 py-2 w-full"
            placeholder="e.g. Deadhang circuit, Easy run"
          />
        </div>

        {/* Type */}
        <div>
          <label className="text-xs uppercase tracking-widest text-muted">Type</label>
          <TypePicker value={typeId} onChange={setTypeId} />
        </div>

        {/* Format */}
        <div>
          <label className="text-xs uppercase tracking-widest text-muted">Format</label>
          <div className="mt-1 flex flex-wrap gap-2">
            {FORMATS.map((f) => (
              <button
                key={f.type}
                onClick={() => setFormatType(f.type)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider border ${
                  formatType === f.type ? 'bg-accent text-bg border-accent' : 'bg-transparent text-muted border-line'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {formatType === 'amrap' && (
            <div className="mt-3 flex items-center gap-3">
              <span className="text-sm text-muted">Duration</span>
              <TimeInput valueSec={amrapSec} onChange={setAmrapSec} placeholder />
            </div>
          )}
          {formatType === 'emom' && (
            <div className="mt-3 flex items-center gap-3 flex-wrap">
              <span className="text-sm text-muted">Every</span>
              <TimeInput valueSec={emomEverySec} onChange={setEmomEverySec} placeholder compact />
              <span className="text-sm text-muted">×</span>
              <NumberBox value={emomTotal} onChange={setEmomTotal} />
              <span className="text-sm text-muted">rounds</span>
            </div>
          )}
          {formatType === 'intervals' && (
            <div className="mt-3 flex items-center gap-2 flex-wrap text-sm text-muted">
              <NumberBox value={intervalRounds} onChange={setIntervalRounds} />
              <span>rounds ·</span>
              <span>work</span>
              <TimeInput valueSec={intervalWorkSec} onChange={setIntervalWorkSec} placeholder compact />
              <span>rest</span>
              <TimeInput valueSec={intervalRestSec} onChange={setIntervalRestSec} placeholder compact />
            </div>
          )}
        </div>
      </section>

      {/* Blocks */}
      <section className="px-4 pt-6 space-y-3">
        <div className="text-xs uppercase tracking-widest text-accent">Exercises</div>
        {blocks.map((block, bi) => {
          const hasWork = block.rows.some(isExercise);

          // --- Standalone rest block (rest once between work blocks) ---
          if (!hasWork) {
            const ri = block.rows.findIndex(isRest);
            const rest = block.rows[ri] as RestSpec | undefined;
            return (
              <div key={bi} className="bg-panel rounded-lg p-3 flex items-center gap-2">
                <span className="text-sm font-semibold flex-1">Rest</span>
                <TimeInput
                  valueSec={rest?.restSec}
                  onChange={(v) => updateRow(bi, ri, { restSec: v ?? 0 })}
                  placeholder
                  compact
                />
                <button onClick={() => removeBlock(bi)} className="text-red-400 text-xs px-2 py-1">Remove</button>
              </div>
            );
          }

          // --- Work block (rounds with interleaved exercise + rest rows) ---
          return (
            <div key={bi} className="bg-panel rounded-lg p-3">
              <div className="flex items-center gap-2">
                {multiWork ? (
                  <input
                    value={block.label ?? ''}
                    onChange={(e) => updateBlock(bi, { label: e.target.value })}
                    className="flex-1 bg-panel2 rounded px-2 py-1 text-sm"
                    placeholder={`Block ${bi + 1}`}
                  />
                ) : (
                  <span className="text-sm font-semibold flex-1">Rounds</span>
                )}
                <span className="text-xs text-muted">×</span>
                <NumberBox value={block.repeat} onChange={(v) => updateBlock(bi, { repeat: v })} />
                {canRemoveBlock && (
                  <button onClick={() => removeBlock(bi)} className="text-red-400 text-xs px-2 py-1">Remove</button>
                )}
              </div>

              <div className="mt-2 space-y-2">
                {block.rows.map((row, ri) => {
                  if (isRest(row)) {
                    return (
                      <div key={ri} className="bg-panel2 rounded p-2 flex items-center gap-2">
                        <span className="text-sm text-muted flex-1">Rest</span>
                        <TimeInput
                          valueSec={row.restSec}
                          onChange={(v) => updateRow(bi, ri, { restSec: v ?? 0 })}
                          placeholder
                          compact
                        />
                        <button
                          onClick={() => removeRow(bi, ri)}
                          className="text-muted text-lg leading-none px-1"
                          aria-label="Remove rest"
                        >×</button>
                      </div>
                    );
                  }
                  const ex = row;
                  const noQty = ex.unit === 'failure' || ex.unit === 'max';
                  return (
                    <div key={ri} className="bg-panel2 rounded p-2 space-y-2">
                      <div className="flex items-center gap-2">
                        <input
                          value={ex.name}
                          onChange={(e) => updateRow(bi, ri, { name: e.target.value })}
                          className="flex-1 bg-bg rounded px-2 py-1.5 text-sm"
                          placeholder="Exercise (e.g. Deadhang, Run)"
                        />
                        <button
                          onClick={() => removeRow(bi, ri)}
                          className="text-muted text-lg leading-none px-1"
                          aria-label="Remove exercise"
                        >×</button>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {!noQty && (
                          <NumberBox
                            value={ex.qty}
                            onChange={(v) => updateRow(bi, ri, { qty: v })}
                            placeholder="qty"
                          />
                        )}
                        <select
                          value={ex.unit ?? 'reps'}
                          onChange={(e) => updateRow(bi, ri, { unit: e.target.value as TargetUnit })}
                          className="bg-bg rounded px-2 py-1.5 text-sm"
                        >
                          {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                        </select>
                        {ex.weight ? (
                          <>
                            <NumberBox
                              value={ex.weight.value || undefined}
                              onChange={(v) => updateRow(bi, ri, { weight: { value: v ?? 0, unit: ex.weight!.unit } })}
                              placeholder="wt"
                            />
                            <select
                              value={ex.weight.unit}
                              onChange={(e) => updateRow(bi, ri, { weight: { value: ex.weight!.value, unit: e.target.value as WeightUnit } })}
                              className="bg-bg rounded px-2 py-1.5 text-sm"
                            >
                              <option value="kg">kg</option>
                              <option value="lb">lb</option>
                            </select>
                            <button
                              onClick={() => updateRow(bi, ri, { weight: undefined })}
                              className="text-muted text-xs"
                            >
                              remove
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => updateRow(bi, ri, { weight: { value: 0, unit: 'kg' } })}
                            className="text-accent text-xs"
                          >
                            + weight
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
                <div className="flex gap-4">
                  <button onClick={() => addRow(bi, emptyExercise())} className="text-accent text-sm">+ Add exercise</button>
                  <button onClick={() => addRow(bi, emptyRest())} className="text-accent text-sm">+ Add rest</button>
                </div>
              </div>
            </div>
          );
        })}
        <div className="flex gap-2">
          <button onClick={addBlock} className="flex-1 border border-line rounded-lg py-2 text-sm text-muted">
            + Add block
          </button>
          <button onClick={addRestBlock} className="flex-1 border border-line rounded-lg py-2 text-sm text-muted">
            + Add rest
          </button>
        </div>
      </section>

      {/* Intensity */}
      <section className="px-4 pt-6">
        <label className="text-xs uppercase tracking-widest text-muted">Intensity</label>
        <div className="mt-1 flex gap-2">
          {INTENSITIES.map((it) => (
            <button
              key={it.value}
              onClick={() => setIntensity(intensity === it.value ? undefined : it.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider border ${
                intensity === it.value ? 'bg-accent text-bg border-accent' : 'bg-transparent text-muted border-line'
              }`}
            >
              {it.label}
            </button>
          ))}
        </div>
      </section>

      <section className="px-4 pt-6">
        <label className="text-xs uppercase tracking-widest text-muted">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="mt-1 w-full bg-panel rounded px-3 py-2 text-sm"
          placeholder="One note per line"
        />
      </section>

      <div className="fixed bottom-[calc(env(safe-area-inset-bottom)+56px)] left-0 right-0 bg-bg border-t border-line p-3">
        <button
          onClick={save}
          disabled={!canSave}
          className="w-full bg-accent text-bg rounded-lg py-3 font-semibold uppercase tracking-wider disabled:opacity-40"
        >
          {editingId ? 'Save changes' : 'Save workout'}
        </button>
      </div>
    </div>
  );
}

function NumberBox({
  value, onChange, placeholder,
}: { value?: number; onChange: (n?: number) => void; placeholder?: string }) {
  return (
    <input
      type="number"
      inputMode="numeric"
      pattern="[0-9]*"
      className="w-16 bg-bg rounded px-2 py-1.5 text-center text-sm"
      placeholder={placeholder}
      value={value ?? ''}
      onFocus={(e) => e.target.select()}
      onChange={(e) => {
        const v = e.target.value;
        if (v === '') onChange(undefined);
        else {
          const n = parseInt(v, 10);
          onChange(isNaN(n) ? undefined : n);
        }
      }}
    />
  );
}
