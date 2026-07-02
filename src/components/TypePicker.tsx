import { useEffect, useState } from 'react';
import { getWorkoutTypes, newId, saveWorkoutType } from '../db';
import type { WorkoutType } from '../types';

// Label color palette for new workout types (existing accent hexes + extras).
const TYPE_COLORS = ['#5BC0EB', '#2ECC71', '#FF6B6B', '#9B59B6', '#F0E040', '#FF9F43', '#FF6BB5', '#4ADEDE'];

// Workout-type chip row, shared by the workout builder and the quick custom
// log. Tap a chip to pick (tap again to clear); "+ New type" creates one
// inline — name + label color — saved to the DB for reuse everywhere. The
// selected type can be edited in place; color changes propagate to every
// surface (past logs included) since colors are resolved live, never stored.
export default function TypePicker({
  value,
  onChange,
}: {
  value?: string;
  onChange: (typeId?: string) => void;
}) {
  const [types, setTypes] = useState<WorkoutType[]>([]);
  const [form, setForm] = useState<'create' | 'edit' | null>(null);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(TYPE_COLORS[0]);

  useEffect(() => {
    getWorkoutTypes().then(setTypes);
  }, []);

  const selectedType = types.find((t) => t.id === value);

  function openCreate() {
    setNewName('');
    setNewColor(TYPE_COLORS[0]);
    setForm('create');
  }

  function openEdit() {
    if (!selectedType) return;
    setNewName(selectedType.name);
    setNewColor(selectedType.color);
    setForm('edit');
  }

  async function submit() {
    const name = newName.trim();
    if (!name) return;
    const t: WorkoutType =
      form === 'edit' && selectedType
        ? { ...selectedType, name, color: newColor }
        : { id: newId(), name, color: newColor, createdAt: Date.now() };
    await saveWorkoutType(t);
    setTypes((prev) => (prev.some((x) => x.id === t.id) ? prev.map((x) => (x.id === t.id ? t : x)) : [...prev, t]));
    onChange(t.id);
    setForm(null);
  }

  return (
    <div>
      <div className="mt-1 flex flex-wrap gap-2">
        {types.map((t) => {
          const selected = value === t.id;
          return (
            <button
              key={t.id}
              onClick={() => onChange(selected ? undefined : t.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider border ${
                selected ? '' : 'bg-transparent text-muted border-line'
              }`}
              style={selected ? { color: t.color, borderColor: t.color, backgroundColor: `${t.color}1A` } : undefined}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: t.color }} />
              {t.name}
            </button>
          );
        })}
        <button
          onClick={() => (form ? setForm(null) : openCreate())}
          className="px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider border border-dashed border-line text-accent"
        >
          {form ? 'Cancel' : '+ New type'}
        </button>
        {selectedType && !form && (
          <button
            onClick={openEdit}
            className="px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider border border-dashed border-line text-muted"
          >
            ✎ Edit type
          </button>
        )}
      </div>

      {form && (
        <div className="mt-3 bg-panel rounded-lg p-3 space-y-3">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="block bg-panel2 rounded px-3 py-2 w-full text-sm"
            placeholder="Type name (e.g. Mobility, Swim)"
            autoFocus
          />
          <div className="flex items-center gap-2 flex-wrap">
            {TYPE_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setNewColor(c)}
                aria-label={`Color ${c}`}
                className={`w-7 h-7 rounded-full ${newColor === c ? 'ring-2 ring-white ring-offset-2 ring-offset-panel' : ''}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <button
            onClick={submit}
            disabled={!newName.trim()}
            className="w-full bg-panel2 rounded py-2 text-sm font-semibold uppercase tracking-wider disabled:opacity-40"
            style={{ color: newColor }}
          >
            {form === 'edit' ? 'Save type' : 'Create type'}
          </button>
        </div>
      )}
    </div>
  );
}
